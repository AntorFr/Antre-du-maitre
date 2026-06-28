import type {
  ScenarioChatHistoryEntry,
  ScenarioData,
  ScenarioStep,
} from '@antre-du-maitre/shared';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';

import {
  canTransitionToScenarioStep,
  normalizeScenarioData,
} from '../domain/scenario-state.js';
import { prisma } from '../lib/prisma.js';
import {
  authenticate,
  canAccessOwnedResource,
} from '../middleware/auth.js';
import { ensureActDetails } from '../services/act-details.js';
import { createLlmProvider } from '../services/llm/index.js';
import { searchMonsters } from '../services/monsters.js';
import { generateMockTodoItems } from '../services/todo.js';
import { buildWorldSummary } from '../services/world-summary.js';

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(4_000),
  voiceInput: z.boolean().default(false),
});

function readChatHistory(value: Prisma.JsonValue): ScenarioChatHistoryEntry[] {
  return Array.isArray(value)
    ? (value as unknown as ScenarioChatHistoryEntry[])
    : [];
}

export async function registerChatRoutes(app: FastifyInstance) {
  const llmProvider = createLlmProvider();

  app.post(
    '/api/scenarios/:id/chat',
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = chatRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          message: 'Invalid chat payload.',
          issues: parsed.error.issues,
        });
      }

      const scenario = await prisma.scenario.findUnique({
        where: {
          id,
        },
      });

      if (!scenario) {
        return reply.code(404).send({
          message: 'Scenario not found.',
        });
      }

      if (!canAccessOwnedResource(request.user, scenario.userId)) {
        return reply.code(403).send({
          message: 'You cannot access this scenario.',
        });
      }

      const world = await prisma.world.findUnique({
        where: {
          userId: scenario.userId,
        },
        include: {
          entities: true,
        },
      });

      if (!world) {
        return reply.code(409).send({
          message: 'Scenario owner has no world.',
        });
      }

      const currentData = normalizeScenarioData(scenario.data);

      if (
        currentData.currentStep === 'STEP_10_RECAP' &&
        isScenarioValidationMessage(parsed.data.message)
      ) {
        const persistedData = ensureActDetails(currentData);
        const now = new Date().toISOString();
        const responseReply =
          "C'est validé, ton aventure est prête à jouer ! Tu peux maintenant préparer les actes, les rencontres et les aides de partie.";
        const nextHistory = [
          ...readChatHistory(scenario.chatHistory),
          {
            role: 'user' as const,
            content: parsed.data.message,
            voiceInput: parsed.data.voiceInput,
            createdAt: now,
          },
          {
            role: 'assistant' as const,
            content: responseReply,
            suggestions: ['Voir la fiche', 'Préparer la partie'],
            createdAt: now,
          },
        ];

        await prisma.$transaction(async (tx) => {
          await tx.scenario.update({
            where: {
              id: scenario.id,
            },
            data: {
              data: persistedData as unknown as Prisma.InputJsonValue,
              chatHistory: nextHistory as unknown as Prisma.InputJsonValue,
              status: 'COMPLETE',
            },
          });

          await tx.scenarioSession.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          if (persistedData.sessionning) {
            await tx.scenarioSession.createMany({
              data: persistedData.sessionning.sessions.map((session) => ({
                scenarioId: scenario.id,
                number: session.numero,
                plannedActes: session.actesInclus,
                plannedDuration: session.dureeEstimeeMin,
                recapHook: session.resumeAccroche,
              })),
            });
          }

          await tx.todoItem.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          await tx.todoItem.createMany({
            data: generateMockTodoItems(persistedData).map((item) => ({
              scenarioId: scenario.id,
              ...item,
            })),
          });
        });

        return {
          reply: responseReply,
          suggestions: ['Voir la fiche', 'Préparer la partie'],
          scenarioUpdate: null,
          proposedEntities: [],
          stepComplete: true,
          nextStep: null,
        };
      }

      const monsterCatalog = await buildMonsterCatalogForTurn({
        userMessage: parsed.data.message,
        currentStep: currentData.currentStep,
      });
      const response = await llmProvider.createScenarioTurn({
        message: parsed.data.message,
        voiceInput: parsed.data.voiceInput,
        scenarioId: scenario.id,
        userId: scenario.userId,
        scenario: currentData,
        worldSummary: buildWorldSummary(world.entities),
        monsterCatalog,
      });

      if (
        response.stepComplete &&
        !canTransitionToScenarioStep(currentData.currentStep, response.nextStep)
      ) {
        request.log.warn(
          {
            scenarioId: scenario.id,
            currentStep: currentData.currentStep,
            proposedNextStep: response.nextStep,
          },
          'Rejected invalid LLM step transition.',
        );

        return reply.code(502).send({
          message: 'Invalid step transition returned by LLM.',
        });
      }

      const nextData: ScenarioData = normalizeScenarioData({
        ...currentData,
        ...(response.scenarioUpdate ?? {}),
        currentStep:
          response.stepComplete && response.nextStep
            ? response.nextStep
            : currentData.currentStep,
      });
      const isCompletingScenario =
        response.stepComplete &&
        currentData.currentStep === 'STEP_10_RECAP' &&
        response.nextStep === null;
      const persistedData = isCompletingScenario
        ? ensureActDetails(nextData)
        : nextData;
      const responseSuggestions =
        response.stepComplete && response.nextStep
          ? resolveSuggestionsForScenarioStep({
              suggestions: response.suggestions,
              targetStep: response.nextStep,
              previousStep: currentData.currentStep,
            })
          : response.suggestions;
      const responseReply =
        response.stepComplete && response.nextStep
          ? appendNextStepQuestion(response.reply, response.nextStep)
          : response.reply;

      const now = new Date().toISOString();
      const nextHistory = [
        ...readChatHistory(scenario.chatHistory),
        {
          role: 'user' as const,
          content: parsed.data.message,
          voiceInput: parsed.data.voiceInput,
          createdAt: now,
        },
        {
          role: 'assistant' as const,
          content: responseReply,
          suggestions: responseSuggestions,
          createdAt: now,
        },
      ];

      await prisma.$transaction(async (tx) => {
        await tx.scenario.update({
          where: {
            id: scenario.id,
          },
          data: {
            data: persistedData as unknown as Prisma.InputJsonValue,
            chatHistory: nextHistory as unknown as Prisma.InputJsonValue,
            ...(isCompletingScenario ? { status: 'COMPLETE' } : {}),
          },
        });

        if (response.proposedEntities.length > 0) {
          await tx.worldEntityProposal.createMany({
            data: response.proposedEntities.map((entity) => ({
              worldId: world.id,
              scenarioId: scenario.id,
              type: entity.type,
              name: entity.name,
              description: entity.description,
              tags: entity.tags,
              source: entity.source,
            })),
          });
        }

        if (isCompletingScenario) {
          await tx.scenarioSession.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          if (persistedData.sessionning) {
            await tx.scenarioSession.createMany({
              data: persistedData.sessionning.sessions.map((session) => ({
                scenarioId: scenario.id,
                number: session.numero,
                plannedActes: session.actesInclus,
                plannedDuration: session.dureeEstimeeMin,
                recapHook: session.resumeAccroche,
              })),
            });
          }

          await tx.todoItem.deleteMany({
            where: {
              scenarioId: scenario.id,
            },
          });

          await tx.todoItem.createMany({
            data: generateMockTodoItems(persistedData).map((item) => ({
              scenarioId: scenario.id,
              ...item,
            })),
          });
        }
      });

      const scenarioPatch = {
        ...(response.scenarioUpdate ?? {}),
        ...(response.stepComplete && response.nextStep
          ? { currentStep: response.nextStep }
          : {}),
      };

      return {
        ...response,
        reply: responseReply,
        suggestions: responseSuggestions,
        scenarioUpdate:
          Object.keys(scenarioPatch).length > 0 ? scenarioPatch : null,
      };
    },
  );
}

function isScenarioValidationMessage(message: string) {
  const normalized = message
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');

  if (
    normalized.includes('ajust') ||
    normalized.includes('modifier') ||
    normalized.includes('changer') ||
    normalized.includes('avant le recap')
  ) {
    return false;
  }

  return (
    [
      'valider',
      'valide',
      'ok',
      'oui',
      "c'est bon",
      'cest bon',
      'terminer',
      'finaliser',
    ].includes(normalized) ||
    normalized.startsWith('oui ') ||
    normalized.includes('recap complet') ||
    normalized.includes('montre-moi le recap') ||
    normalized.includes('montre moi le recap') ||
    normalized.includes('valider le scenario') ||
    normalized.includes('finaliser le scenario')
  );
}

function appendNextStepQuestion(reply: string, step: ScenarioStep): string {
  const question = buildQuestionForScenarioStep(step);

  if (!question || reply.includes(question)) {
    return reply;
  }

  return `${reply}\n\n${question}`;
}

function buildQuestionForScenarioStep(step: ScenarioStep): string | null {
  switch (step) {
    case 'STEP_1_SENSATION':
      return "Quelle sensation veux-tu donner à ton aventure ?";
    case 'STEP_2_LIEU':
      return 'Où se déroule surtout cette aventure ? Choisis ou imagine un lieu avec une image forte.';
    case 'STEP_3_QUETE':
      return "Quel est le problème central : qu'est-ce qui ne va pas, pourquoi c'est grave, et pourquoi faut-il agir maintenant ?";
    case 'STEP_4_ANTAGONISTE':
      return 'Quelle est la cause du problème : une personne, une créature, une magie déréglée, un malentendu ou autre chose ?';
    case 'STEP_5_OBJECTIF_HEROS':
      return 'Que doivent réussir les héros, en une phrase simple et visible pour les joueurs ?';
    case 'STEP_6_ACTES':
      return "Quelles sont les grandes étapes de l'aventure, du départ jusqu'au final ?";
    case 'STEP_7_PNJS':
      return 'Quels PNJs importants le MJ doit-il pouvoir jouer facilement ?';
    case 'STEP_8_DUREE':
      return 'Combien de temps doit durer la partie, et comment répartir ce temps entre les actes ?';
    case 'STEP_9_FIN':
      return 'Quelle fin satisfaisante veux-tu offrir aux joueurs ?';
    case 'STEP_10_RECAP':
      return 'Veux-tu valider ce scénario ou modifier un dernier détail ?';
  }
}

function resolveSuggestionsForScenarioStep(input: {
  suggestions: string[];
  targetStep: ScenarioStep;
  previousStep: ScenarioStep;
}) {
  const normalized = normalizeSuggestions(input.suggestions);
  const previousStepDefaults = buildSuggestionsForScenarioStep(input.previousStep);

  if (
    normalized.length > 0 &&
    !hasStrongSuggestionOverlap(normalized, previousStepDefaults) &&
    !hasSuggestionStepDrift({
      suggestions: normalized,
      targetStep: input.targetStep,
      previousStep: input.previousStep,
    })
  ) {
    return normalized;
  }

  return buildSuggestionsForScenarioStep(input.targetStep);
}

function normalizeSuggestions(suggestions: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const suggestion of suggestions) {
    const trimmed = suggestion.trim();
    const key = normalizeSuggestionKey(trimmed);

    if (!trimmed || seen.has(key)) continue;

    seen.add(key);
    normalized.push(trimmed);

    if (normalized.length === 6) break;
  }

  return normalized;
}

function hasStrongSuggestionOverlap(
  suggestions: string[],
  referenceSuggestions: string[],
) {
  const referenceKeys = new Set(
    referenceSuggestions.map((suggestion) => normalizeSuggestionKey(suggestion)),
  );
  const matchingCount = suggestions.filter((suggestion) =>
    referenceKeys.has(normalizeSuggestionKey(suggestion)),
  ).length;

  return matchingCount >= Math.min(3, suggestions.length);
}

function hasSuggestionStepDrift(input: {
  suggestions: string[];
  targetStep: ScenarioStep;
  previousStep: ScenarioStep;
}) {
  const previousKeywords = getSuggestionKeywordsForStep(input.previousStep);
  const targetKeywords = getSuggestionKeywordsForStep(input.targetStep);

  if (previousKeywords.length === 0 || targetKeywords.length === 0) {
    return false;
  }

  const previousMatches = input.suggestions.filter((suggestion) =>
    containsAnyKeyword(suggestion, previousKeywords),
  ).length;
  const targetMatches = input.suggestions.filter((suggestion) =>
    containsAnyKeyword(suggestion, targetKeywords),
  ).length;

  return previousMatches >= Math.ceil(input.suggestions.length / 2) && targetMatches === 0;
}

function containsAnyKeyword(value: string, keywords: string[]) {
  const normalized = normalizeSuggestionKey(value);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function getSuggestionKeywordsForStep(step: ScenarioStep) {
  const keywords: Record<ScenarioStep, string[]> = {
    STEP_1_SENSATION: ['mystere', 'humour', 'action', 'frisson', 'merveille', 'exploration', 'ambiance', 'sensation'],
    STEP_2_LIEU: ['lieu', 'donjon', 'village', 'foret', 'grotte', 'ile', 'chateau', 'marais', 'nom', 'detail rigolo'],
    STEP_3_QUETE: ['probleme', 'quete', 'grave', 'maintenant', 'urgence', 'catastrophe', 'disparu', 'bloque', 'secret', 'aide'],
    STEP_4_ANTAGONISTE: ['antagoniste', 'creature', 'malediction', 'rival', 'accident', 'malentendu', 'cause', 'mechant'],
    STEP_5_OBJECTIF_HEROS: ['objectif', 'heros', 'retrouver', 'apaiser', 'stopper', 'proteger', 'ouvrir', 'reunir'],
    STEP_6_ACTES: ['acte', 'depart', 'exploration', 'revelation', 'final', 'etape', 'deroule'],
    STEP_7_PNJS: ['pnj', 'guide', 'temoin', 'rival', 'demande', 'aide', 'creature'],
    STEP_8_DUREE: ['session', 'minutes', 'duree', 'rythme', 'raccourcir', 'long', 'court'],
    STEP_9_FIN: ['fin', 'fete', 'surprise', 'recompense', 'gardien', 'souvenir', 'promesse'],
    STEP_10_RECAP: ['valider', 'changer', 'resume', 'recap', 'drole', 'simple', 'final'],
  };

  return keywords[step];
}

function normalizeSuggestionKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ');
}

function buildSuggestionsForScenarioStep(step: ScenarioStep): string[] {
  switch (step) {
    case 'STEP_1_SENSATION':
      return [
        'Mystère',
        'Humour',
        'Action',
        'Frisson doux',
        'Merveilleux',
        'Exploration',
      ];
    case 'STEP_2_LIEU':
      return [
        'Une forêt aux chemins mouvants',
        'Un village dans la brume',
        'Une grotte qui chante',
        'Une île aux ruines lumineuses',
        'Un château qui change de pièces',
        'Un marais plein de lucioles',
      ];
    case 'STEP_3_QUETE':
      return [
        'Un objet magique a disparu',
        'Une créature bloque le village',
        'Une magie se dérègle ce soir',
        'Quelqu’un appelle à l’aide',
        'Un lieu devient dangereux',
        'Un secret doit être compris',
      ];
    case 'STEP_4_ANTAGONISTE':
      return [
        'Une créature incomprise',
        'Une malédiction',
        'Un rival jaloux',
        'Un accident magique',
        'Un malentendu',
        'Une catastrophe naturelle',
      ];
    case 'STEP_5_OBJECTIF_HEROS':
      return [
        'Retrouver l’objet avant la nuit',
        'Apaiser la créature',
        'Stopper la magie déréglée',
        'Protéger le village',
        'Ouvrir le passage secret',
        'Réunir deux anciens amis',
      ];
    case 'STEP_6_ACTES':
      return [
        'Départ, exploration, révélation, final',
        'Un début très fort',
        'Un final spectaculaire',
        'Une fausse piste au milieu',
        'Un choix difficile mais doux',
        'Une révélation amusante',
      ];
    case 'STEP_7_PNJS':
      return [
        'Quelqu’un qui demande de l’aide',
        'Un guide amusant',
        'Quelqu’un qui bloque les héros',
        'Un témoin qui a peur',
        'Un rival pas si méchant',
        'Une créature à rassurer',
      ];
    case 'STEP_8_DUREE':
      return [
        'Une session de 90 minutes',
        'Deux sessions courtes',
        'Raccourcir le milieu',
        'Un final plus long',
        'Une intro très rapide',
        'Trois petites sessions',
      ];
    case 'STEP_9_FIN':
      return [
        'Une fête au village',
        'Une surprise magique',
        'Une récompense amusante',
        'Un nouveau gardien du lieu',
        'Un objet souvenir',
        'Une promesse pour la suite',
      ];
    case 'STEP_10_RECAP':
      return [
        'Valider',
        'Changer un détail',
        'Réentendre le résumé',
        'Rendre plus drôle',
        'Rendre plus simple',
        'Renforcer le final',
      ];
  }
}

async function buildMonsterCatalogForTurn(input: {
  userMessage: string;
  currentStep: ScenarioData['currentStep'];
}) {
  if (
    input.currentStep !== 'STEP_4_ANTAGONISTE'
  ) {
    return [];
  }

  const query = input.userMessage.trim();
  const matchingMonsters = query
    ? await searchMonsters({
        query,
        limit: 40,
      })
    : [];

  if (matchingMonsters.length > 0) {
    return matchingMonsters;
  }

  return searchMonsters({
    limit: 40,
  });
}
