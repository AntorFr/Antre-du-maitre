import type {
  ScenarioChatResponse,
  SessionDebriefResponse,
} from '@antre-du-maitre/shared';

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

    if (currentStep === 'STEP_1_SENSATION') {
      const lowerMessage = trimmedMessage.toLowerCase();
      const ambiance = lowerMessage.includes('humour') || lowerMessage.includes('drôle')
        ? 'humour'
        : lowerMessage.includes('action')
          ? 'action'
          : lowerMessage.includes('frisson') || lowerMessage.includes('inqui')
            ? 'frisson'
            : lowerMessage.includes('merveille')
              ? 'merveilleux'
              : lowerMessage.includes('explor')
                ? 'exploration'
                : 'mystere';

      return {
        reply: `Très bien, ton aventure aura une sensation ${ambiance}. Maintenant, inventons un lieu fort : son nom, son image, son danger et son secret.`,
        suggestions: ['Une grotte qui chante', 'Un village dans la brume', 'Une forêt aux chemins mouvants'],
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
        reply: `Ce lieu donne envie de jouer. Quel est le problème central : qu'est-ce qui ne va pas, pourquoi c'est grave et pourquoi agir maintenant ?`,
        suggestions: ['Un objet magique a disparu', 'Une créature bloque le village', 'Une magie se dérègle ce soir'],
        scenarioUpdate: {
          lieu: {
            nom: trimmedMessage,
            type: 'autre',
            imageForte: `Un lieu marquant nommé ${trimmedMessage}.`,
            particulariteMagique: 'Quelque chose d’étrange y arrive quand les héros approchent.',
            dangerPrincipal: 'Un danger simple oblige les héros à rester attentifs.',
            endroitSecret: 'Un passage caché peut révéler la vérité.',
            description: `Un lieu important nommé ${trimmedMessage}, avec un danger clair et un secret à découvrir.`,
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
        reply: `On sent bien l'urgence. Maintenant, cherchons la cause du problème : méchant, malentendu, créature incomprise ou magie déréglée ?`,
        suggestions: ['Une créature incomprise', 'Une malédiction', 'Un rival jaloux'],
        scenarioUpdate: {
          quete: {
            phraseSimple: trimmedMessage,
            ceQuiNeVaPas: trimmedMessage,
            pourquoiCestGrave: 'Les habitants ou le lieu risquent de perdre quelque chose d’important.',
            pourquoiMaintenant: 'Le problème doit être réglé avant la fin de la journée.',
            ceQuiArriveSiPersonneNagit: 'La situation empire et l’aventure devient beaucoup plus difficile.',
          },
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_4_ANTAGONISTE') {
      const selectedMonster = input.monsterCatalog[0];

      return {
        reply: `La cause du problème est claire. Résumons maintenant ce que les héros doivent réussir en une phrase simple.`,
        suggestions: ['Retrouver l’objet avant la nuit', 'Apaiser la créature', 'Stopper la magie déréglée'],
        scenarioUpdate: {
          antagoniste: {
            type: 'creature_incomprise',
            nom: trimmedMessage,
            nature: selectedMonster
              ? `inspiré de ${selectedMonster.name}`
              : 'antagoniste inventé',
            description: `La cause principale du problème : ${trimmedMessage}.`,
            monsterId: selectedMonster?.id,
            motivation: 'Il agit pour une raison compréhensible, même s’il crée un problème.',
            ceQuIlVeut: 'Obtenir ce qui lui manque ou protéger son secret.',
            faiblesseOuSolution: 'Comprendre sa motivation permet de trouver une solution sans tout régler par la force.',
          },
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_5_OBJECTIF_HEROS') {
      return {
        reply: `Parfait, le MJ saura toujours quoi rappeler aux joueurs. Construisons maintenant les 3 à 5 grandes étapes de l'aventure.`,
        suggestions: ['Départ, exploration, révélation, final', 'Un début très fort', 'Un final spectaculaire'],
        scenarioUpdate: {
          objectifDesHeros: {
            phraseSimple: trimmedMessage,
            objectifVisible: trimmedMessage,
            signeDeReussite: 'Le problème est résolu et tout le monde voit clairement que les héros ont réussi.',
          },
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_6_ACTES') {
      return {
        reply: `La colonne vertébrale est prête. Ajoutons maintenant quelques PNJs importants, sans en mettre trop.`,
        suggestions: ['Quelqu’un qui demande de l’aide', 'Un guide amusant', 'Quelqu’un qui bloque les héros'],
        scenarioUpdate: {
          actes: [
            {
              numero: 1,
              titre: 'Le problème apparaît',
              type: 'depart',
              roleDansLHistoire: 'depart',
              description: trimmedMessage,
              obstaclePrincipal: 'Les héros doivent comprendre ce qui se passe.',
              options: ['Observer', 'Questionner', 'Suivre une première piste'],
              dureeEstimeeMin: 20,
              pointDeCoupure: false,
              notesMJ: 'Donner un objectif visible rapidement.',
            },
            {
              numero: 2,
              titre: 'La piste principale',
              type: 'exploration',
              roleDansLHistoire: 'exploration',
              description: 'Les héros explorent et trouvent une piste importante.',
              obstaclePrincipal: 'Le lieu complique leur progression.',
              options: ['Chercher des indices', 'Prendre un raccourci risqué'],
              dureeEstimeeMin: 25,
              pointDeCoupure: true,
              notesMJ: 'Prévoir une relance si les joueurs bloquent.',
            },
            {
              numero: 3,
              titre: 'La vérité',
              type: 'revelation',
              roleDansLHistoire: 'revelation',
              description: 'Les héros comprennent la vraie cause du problème.',
              informationApprise: 'Le problème peut être résolu autrement que par la force.',
              options: ['Comprendre', 'Négocier', 'Préparer le final'],
              dureeEstimeeMin: 20,
              pointDeCoupure: false,
              notesMJ: 'Rendre la révélation claire.',
            },
            {
              numero: 4,
              titre: 'La résolution',
              type: 'confrontation',
              roleDansLHistoire: 'confrontation',
              description: 'Les héros règlent le problème dans une scène finale visuelle.',
              obstaclePrincipal: 'La situation presse.',
              options: ['Agir vite', 'Parler', 'Prendre un risque héroïque'],
              dureeEstimeeMin: 25,
              pointDeCoupure: false,
              notesMJ: 'Finir sur une image forte.',
            },
          ],
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_7_PNJS') {
      return {
        reply: `Ces personnages seront faciles à jouer. Choisissons maintenant la durée et l'équilibre entre les actes.`,
        suggestions: ['Une session de 90 minutes', 'Deux sessions courtes', 'Raccourcir le milieu'],
        scenarioUpdate: {
          pnjs: [
            ...input.scenario.pnjs,
            {
              nom: trimmedMessage,
              role: 'allie',
              fonctionNarrative: 'aide',
              description: 'Un personnage important rencontré pendant l’aventure.',
              motivation: 'Aider les héros à avancer.',
              attitude: 'curieux et encourageant',
              particularite: 'Il a un détail amusant facile à jouer.',
              informationOuService: 'Il donne une piste utile.',
            },
          ],
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_8_DUREE') {
      return {
        reply: `Le rythme est posé. Imaginons maintenant une fin satisfaisante et visuelle.`,
        suggestions: ['Une fête au village', 'Une surprise magique', 'Une récompense amusante'],
        scenarioUpdate: {
          sessionning: {
            dureeTotaleEstimeeMin: 90,
            nombreSessionsRecommande: 1,
            sessions: [
              {
                numero: 1,
                actesInclus: input.scenario.actes.map((acte) => acte.numero),
                dureeEstimeeMin: 90,
                resumeAccroche: 'Une session centrée sur le problème, la révélation et la résolution.',
              },
            ],
          },
        },
        proposedEntities: [],
        stepComplete: true,
        nextStep,
      };
    }

    if (currentStep === 'STEP_9_FIN') {
      return {
        reply: `Jolie fin. Relisons tout ensemble avant de préparer la partie.`,
        suggestions: ['Valider', 'Changer un détail', 'Réentendre le résumé'],
        scenarioUpdate: {
          fin: {
            conditionDeVictoire: trimmedMessage,
            sceneDeResolution: 'Le problème se résout dans une scène claire, positive et visuelle.',
            recompense: 'Les héros reçoivent une récompense utile ou amusante.',
            petiteSurpriseFinale: 'Un petit détail final donne envie de sourire.',
          },
          recompense: 'Les héros reçoivent une récompense utile ou amusante.',
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
