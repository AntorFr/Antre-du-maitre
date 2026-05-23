import type {
  ScenarioChatResponse,
  SessionDebriefResponse,
} from '@antre-du-maitre/shared';

import { suggestBattleMatsForEncounter } from '../../data/battle-mats/index.js';
import { getNextScenarioStep } from '../../domain/scenario-state.js';
import type {
  LlmProvider,
  ScenarioChatInput,
  SessionDebriefInput,
} from './types.js';

export class MockLlmProvider implements LlmProvider {
  async createScenarioTurn(
    input: ScenarioChatInput,
  ): Promise<ScenarioChatResponse> {
    const currentStep = input.scenario.currentStep;
    const nextStep = getNextScenarioStep(currentStep);
    const trimmedMessage = input.message.trim();

    if (currentStep === 'STEP_1_AMBIANCE') {
      const lowerMessage = trimmedMessage.toLowerCase();
      const ambiance = lowerMessage.includes('humour')
        ? 'humour'
        : lowerMessage.includes('action')
          ? 'action'
          : lowerMessage.includes('frisson')
            ? 'frisson'
            : 'mystere';

      return {
        reply: `Parfait, partons sur une ambiance ${ambiance} ! Où se passe l'aventure ?`,
        suggestions: ['Une forêt ancienne', 'Un village enneigé', 'Des ruines oubliées'],
        scenarioUpdate: {
          ambiance,
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_2_LIEU') {
      return {
        reply: `Très bon lieu ! Quelle mission les héros doivent-ils accomplir là-bas ?`,
        suggestions: ['Retrouver un objet perdu', 'Sauver un ami', 'Résoudre un mystère'],
        scenarioUpdate: {
          lieu: {
            nom: trimmedMessage,
            description: `Un lieu important nommé ${trimmedMessage}.`,
          },
        },
        proposedEntities: [
          {
            type: 'LIEU',
            name: trimmedMessage,
            description: `Un lieu important nommé ${trimmedMessage}.`,
            tags: ['mock'],
            source: 'CREATION',
          },
        ],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_3_QUETE') {
      return {
        reply: `Quelle aventure ! Qui s'oppose aux héros ?`,
        suggestions: ['Une sorcière', 'Un gobelin rusé', 'Un esprit ancien'],
        scenarioUpdate: {
          quete: trimmedMessage,
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_4_MECHANT') {
      const selectedMonster = input.monsterCatalog[0];

      return {
        reply: `Voilà un vrai adversaire ! Qui les héros rencontreront-ils en chemin ?`,
        suggestions: ['Une herboriste alliée', 'Un marchand bavard', 'Un garde inquiet'],
        scenarioUpdate: {
          antagoniste: {
            nom: trimmedMessage,
            nature: selectedMonster
              ? `inspiré de ${selectedMonster.name}`
              : 'antagoniste inventé',
            monsterId: selectedMonster?.id,
            motivation: 'Empêcher les héros de réussir leur quête.',
          },
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_5_PNJS') {
      return {
        reply: `Excellent personnage ! Choisissons maintenant les types de défis.`,
        suggestions: ['Enquête + énigme', 'Combat + fuite', 'Exploration + négociation'],
        scenarioUpdate: {
          pnjs: [
            ...input.scenario.pnjs,
            {
              nom: trimmedMessage,
              role: 'allie',
              description: 'Un personnage utile rencontré pendant l’aventure.',
              motivation: 'Aider les héros.',
            },
          ],
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_6_GAMEPLAY') {
      return {
        reply: `Très bon mélange ! Construisons maintenant les grands actes de l'aventure.`,
        suggestions: ['Début calme puis mystère', 'Action dès le départ', 'Voyage puis révélation'],
        scenarioUpdate: {
          gameplay: {
            types: ['enquete', 'enigme', 'combat'],
            notes: trimmedMessage,
          },
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_7_ACTES') {
      return {
        reply: `Les actes tiennent bien debout ! Plaçons maintenant les rencontres.`,
        suggestions: ['Une embuscade', 'Un obstacle magique', 'Un combat final'],
        scenarioUpdate: {
          actes: [
            {
              numero: 1,
              titre: 'L’appel de l’aventure',
              type: 'enquete',
              description: trimmedMessage,
              options: ['Suivre les indices', 'Interroger un témoin'],
              dureeEstimeeMin: 20,
              pointDeCoupure: false,
              notesMJ: 'Laisser plusieurs chemins possibles.',
            },
            {
              numero: 2,
              titre: 'La découverte',
              type: 'enigme',
              description: 'Les héros comprennent ce qui se trame.',
              options: ['Résoudre l’énigme', 'Trouver un détour'],
              dureeEstimeeMin: 20,
              pointDeCoupure: true,
              notesMJ: 'Donner un indice si les joueurs bloquent.',
            },
            {
              numero: 3,
              titre: 'La confrontation',
              type: 'combat',
              description: 'Les héros affrontent l’antagoniste.',
              options: ['Combattre', 'Négocier avant le combat'],
              dureeEstimeeMin: 25,
              pointDeCoupure: false,
              notesMJ: 'Rendre la fin spectaculaire.',
            },
          ],
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_8_RENCONTRES') {
      const selectedMonster =
        input.monsterCatalog.find(
          (monster) => monster.id === input.scenario.antagoniste?.monsterId,
        ) ?? input.monsterCatalog[0];
      const suggestedMap = suggestBattleMatsForEncounter({
        typeDefi: 'combat',
        ambiance: input.scenario.ambiance ?? 'mystere',
      })[0];

      return {
        reply: `Parfait pour les rencontres ! Vérifions maintenant la durée.`,
        suggestions: ['Garder ce rythme', 'Raccourcir un acte', 'Prévoir deux sessions'],
        scenarioUpdate: {
          rencontres: selectedMonster
            ? [
                {
                  monsterId: selectedMonster.id,
                  nombre: selectedMonster.nc === '0' ? 3 : 1,
                  acteNumero: 3,
                  contexte: `Rencontre avec ${selectedMonster.name} liée à l'antagoniste.`,
                  carteBattleMat: suggestedMap
                    ? {
                        id: suggestedMap.id,
                        volume: suggestedMap.volume,
                        pages: suggestedMap.pages,
                        nom: suggestedMap.nomFr,
                        description: suggestedMap.description,
                      }
                    : undefined,
                },
              ]
            : [],
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_9_DUREE') {
      return {
        reply: `L'aventure rentre bien dans une session. Relisons tout ensemble !`,
        suggestions: ['Valider', 'Changer un détail', 'Réentendre le résumé'],
        scenarioUpdate: {
          sessionning: {
            dureeTotaleEstimeeMin: 90,
            nombreSessionsRecommande: 1,
            sessions: [
              {
                numero: 1,
                actesInclus: [1, 2, 3],
                dureeEstimeeMin: 90,
                resumeAccroche: 'Les héros commencent leur aventure.',
              },
            ],
          },
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_10_RECAP') {
      return {
        reply: `Ton aventure est prête ! Il ne reste plus qu'à préparer la partie.`,
        suggestions: ['Voir la fiche', 'Préparer le todo', 'Créer une autre aventure'],
        scenarioUpdate: {
          notesMJ: trimmedMessage,
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep: null,
      };
    }

    return {
      reply: `J'ai bien entendu : ${input.message}`,
      suggestions: ['Continuer', 'Changer une idée', 'Me proposer autre chose'],
      scenarioUpdate: null,
      proposedEntities: [],
      stepComplete: false,
      nextStep: null,
    };
  }

  async createSessionDebriefTurn(
    input: SessionDebriefInput,
  ): Promise<SessionDebriefResponse> {
    const trimmedMessage = input.message.trim();

    return {
      reply: `Debrief noté pour la session ${input.sessionNumber}. J'ai préparé une proposition légère pour la mémoire du monde.`,
      suggestions: ['Valider le monde', 'Préparer la suite', 'Ajouter un autre détail'],
      proposedEntities: [
        {
          type: 'EVENEMENT',
          name: `Session ${input.sessionNumber} jouée`,
          description: trimmedMessage,
          tags: ['debrief', 'mock'],
          source: 'DEBRIEF',
        },
      ],
      debriefComplete: true,
    };
  }
}
