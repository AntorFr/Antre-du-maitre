import {
  SCENARIO_STEPS,
  type ScenarioChatResponse,
  type ScenarioDetail,
  type ScenarioStep,
  type ScenarioSummary,
} from '@antre-du-maitre/shared';
import { useEffect, useRef, useState } from 'react';

import { FormattedText } from '../components/FormattedText';
import { Icon, type IconName } from '../components/Icon';
import { api, ApiError } from '../lib/api';
import { ProgressSteps } from '../components/ProgressSteps';

type CreateProps = {
  token: string;
  initialScenarioId?: string | null;
  startEmpty?: boolean;
  onScenarioChange: (scenario: ScenarioSummary | null) => void;
  onOpenScenario: () => void;
  onWorldProposal: () => void;
  onScenarioComplete: () => void;
};

type Message = {
  role: 'assistant' | 'user';
  content: string;
};

const WELCOME_MESSAGE =
  "Quelle sensation veux-tu donner à ton aventure ? Elle peut être mystérieuse, drôle, pleine d’action, un peu inquiétante, merveilleuse ou héroïque.";
const DEFAULT_SUGGESTIONS = [
  'Mystère',
  'Humour',
  'Action',
  'Frisson doux',
  'Merveilleux',
  'Exploration',
];
const COMPLETE_MESSAGE =
  "Cette aventure est prête. Si tu veux la modifier, décris-moi la retouche : je repasserai par le fil Merlin.";
const COMPLETE_SUGGESTIONS = [
  'Renforcer le final',
  'Ajouter un indice',
  'Simplifier une rencontre',
];

export function Create({
  token,
  initialScenarioId = null,
  startEmpty = false,
  onScenarioChange,
  onOpenScenario,
  onWorldProposal,
  onScenarioComplete,
}: CreateProps) {
  const [activeScenario, setActiveScenario] = useState<ScenarioSummary | null>(
    null,
  );
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: WELCOME_MESSAGE,
    },
  ]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadScenarios() {
      try {
        const { scenarios: loadedScenarios } = await api.listScenarios(token);

        if (cancelled) return;

        if (startEmpty) {
          activateScenario(null);
          return;
        }

        const initialScenario =
          loadedScenarios.find((scenario) => scenario.id === initialScenarioId) ??
          loadedScenarios[0] ??
          null;
        activateScenario(initialScenario);

        if (initialScenario) {
          try {
            const { scenario } = await api.getScenario(
              token,
              initialScenario.id,
            );

            if (cancelled) return;

            activateScenario(scenario);
          } catch (caughtError) {
            if (cancelled) return;

            setError(
              caughtError instanceof ApiError
                ? caughtError.message
                : "Impossible de charger l'historique Merlin.",
            );
          }
        }
      } catch (caughtError) {
        if (cancelled) return;

        setError(
          caughtError instanceof ApiError
            ? caughtError.message
            : 'Impossible de charger les scénarios.',
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadScenarios();

    return () => {
      cancelled = true;
    };
  }, [initialScenarioId, onScenarioChange, startEmpty, token]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      block: 'end',
    });
  }, [activeScenario?.id, isSending, messages]);

  function activateScenario(scenario: ScenarioSummary | ScenarioDetail | null) {
    setActiveScenario(scenario);
    onScenarioChange(scenario);
    resetConversation(scenario);
  }

  function resetConversation(
    scenario: ScenarioSummary | ScenarioDetail | null,
  ) {
    const isComplete =
      scenario?.status === 'COMPLETE' || scenario?.status === 'PLAYED';
    const history = hasChatHistory(scenario) ? scenario.chatHistory : [];

    if (history.length > 0) {
      const lastAssistantWithSuggestions = [...history]
        .reverse()
        .find(
          (entry) =>
            entry.role === 'assistant' &&
            entry.suggestions &&
            entry.suggestions.length > 0,
        );

      setMessages(
        history.map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
      );
      setSuggestions(
        isComplete
          ? COMPLETE_SUGGESTIONS
          : resolveSuggestionsForScenarioStep({
              suggestions: lastAssistantWithSuggestions?.suggestions ?? [],
              targetStep: scenario?.data.currentStep,
            }),
      );
      setInput('');
      return;
    }

    setMessages([
      {
        role: 'assistant',
        content: isComplete ? COMPLETE_MESSAGE : WELCOME_MESSAGE,
      },
    ]);
    setSuggestions(
      isComplete
        ? COMPLETE_SUGGESTIONS
        : buildSuggestionsForScenarioStep(scenario?.data.currentStep),
    );
    setInput('');
  }

  async function createScenario() {
    const title = window.prompt("Titre de l'aventure", 'Nouvelle aventure');

    if (title === null) {
      return;
    }

    const normalizedTitle = title.trim() || 'Nouvelle aventure';

    setError(null);
    setIsCreating(true);

    try {
      const { scenario } = await api.createScenario(token, {
        title: normalizedTitle,
      });
      activateScenario(scenario);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de créer un scénario.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function sendMessage(message: string) {
    if (!activeScenario || isSending || !message.trim()) {
      return;
    }

    setError(null);
    setIsSending(true);
    setMessages((current) => [
      ...current,
      {
        role: 'user',
        content: message.trim(),
      },
    ]);
    setInput('');

    try {
      const response = await api.chat(token, activeScenario.id, {
        message: message.trim(),
        voiceInput: false,
      });

      await applyChatResponse(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Merlin ne peut pas répondre pour le moment.',
      );
    } finally {
      setIsSending(false);
    }
  }

  async function applyChatResponse(response: ScenarioChatResponse) {
    if (!activeScenario) {
      return;
    }

    const { scenario } = await api.getScenario(token, activeScenario.id);

    setActiveScenario(scenario);
    onScenarioChange(scenario);
    setMessages((current) => [
      ...current,
      {
        role: 'assistant',
        content: response.reply,
      },
    ]);
    setSuggestions(response.suggestions);

    if (response.proposedEntities.length > 0) {
      onWorldProposal();
    }

    if (scenario.status === 'COMPLETE') {
      onScenarioComplete();
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Chargement…
      </div>
    );
  }

  if (!activeScenario) {
    return (
      <section className="flex h-full items-center justify-center p-8">
        <div className="max-w-xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-wizard-600">
            Premier scénario
          </p>
          <h2 className="mt-3 text-3xl font-semibold">
            Créons une aventure
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Merlin te guidera étape par étape pour construire l'histoire, les
            défis et la préparation.
          </p>
          <button
            className="mt-6 rounded-2xl bg-wizard-600 px-5 py-3 font-medium text-white transition hover:bg-wizard-700 disabled:opacity-60"
            disabled={isCreating}
            onClick={createScenario}
          >
            {isCreating ? 'Création…' : 'Commencer une aventure'}
          </button>
        </div>
      </section>
    );
  }

  const data = activeScenario.data;
  const currentStepIndex = SCENARIO_STEPS.indexOf(data.currentStep);
  const progressPct = Math.round(((currentStepIndex + 1) / SCENARIO_STEPS.length) * 100);
  const isMerlinWorking = isSending;

  return (
    <div className="flex h-full min-w-0 bg-white">
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <ProgressSteps
          currentStep={activeScenario.data.currentStep}
          variant="horizontal"
        />

        <div className="shrink-0 border-b border-black/10 bg-white px-[18px] py-3">
          <div className="flex items-center gap-3">
            <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-lg bg-[#f5f5f3] px-4 py-2">
              <span className="whitespace-nowrap text-[12px] text-slate-500">
                Avancement
              </span>
              <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full rounded-full bg-wizard-600"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-[12px] font-medium text-wizard-600">
                {currentStepIndex + 1} / {SCENARIO_STEPS.length}
              </span>
            </div>

            <div className="grid min-w-[360px] grid-cols-3 gap-2">
              <InfoCard icon="location" label="Lieu" value={data.lieu?.nom} />
              <InfoCard icon="spark" label="Ambiance" value={data.ambiance} />
              <InfoCard icon="skull" label="Méchant" value={data.antagoniste?.nom} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#faf9f5] px-[18px] py-4">
          <div className="mx-auto flex max-w-[840px] flex-col gap-3">
            <ChatThread messages={messages} isMerlinWorking={isMerlinWorking} />

            <ScenarioDraftPreview
              onOpenScenario={onOpenScenario}
              scenario={activeScenario}
            />

            {!isMerlinWorking ? (
              <SuggestionPanel
                currentStep={activeScenario.data.currentStep}
                onSelect={(suggestion) => void sendMessage(suggestion)}
                suggestions={suggestions}
              />
            ) : null}

            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-black/10 bg-white px-[18px] py-3">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(input);
            }}
          >
            <button
              className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/15 bg-[#f5f5f3] text-slate-500 transition hover:bg-white hover:text-wizard-700 disabled:opacity-50"
              disabled={isMerlinWorking}
              title="Répondre au micro"
              type="button"
            >
              <Icon name="mic" className="h-4 w-4" />
            </button>
            <input
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-black/15 bg-[#f5f5f3] px-4 text-[13px] outline-none ring-wizard-300 transition focus:ring-4"
              disabled={isMerlinWorking}
              placeholder={
                isMerlinWorking
                  ? 'Merlin prépare la réponse…'
                  : 'Écris une réponse à Merlin…'
              }
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button
              className="min-h-11 rounded-lg bg-wizard-600 px-5 text-[13px] font-medium text-white transition hover:bg-wizard-700 disabled:opacity-60"
              disabled={isMerlinWorking || !input.trim()}
            >
              {isMerlinWorking ? 'Merlin…' : 'Envoyer'}
            </button>
          </form>
        </div>

        {error ? (
          <p className="mx-[18px] mb-3 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-[#f5f5f3] px-3 py-2">
      <p className="flex items-center gap-1 text-[10px] text-slate-500">
        <Icon name={icon} className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 truncate text-[13px] font-medium text-slate-900">
        {value ?? 'À définir'}
      </p>
    </div>
  );
}

function ChatThread({
  isMerlinWorking,
  messages,
}: {
  isMerlinWorking: boolean;
  messages: Message[];
}) {
  return (
    <div className="space-y-3">
      {messages.map((message, index) => (
        <ChatMessageBubble
          index={index}
          key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
          message={message}
        />
      ))}

      {isMerlinWorking ? <MerlinWorkingBubble /> : null}
    </div>
  );
}

function ChatMessageBubble({
  index,
  message,
}: {
  index: number;
  message: Message;
}) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[72%] rounded-2xl rounded-tr-sm bg-wizard-600 px-4 py-3 text-[13px] leading-6 text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wizard-600 text-wizard-100 shadow-sm">
        <Icon name="magic" className="h-4 w-4" />
      </div>
      <div className="max-w-[84%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[13px] leading-6 text-slate-700 shadow-sm ring-1 ring-black/10">
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-wizard-600">
          {index === 0 ? 'Merlin démarre' : 'Merlin'}
        </p>
        <FormattedText text={message.content} />
      </div>
    </div>
  );
}

function MerlinWorkingBubble() {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wizard-600 text-wizard-100 shadow-sm">
        <Icon name="spark" className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-wizard-100 px-4 py-3 text-wizard-700 shadow-sm ring-1 ring-wizard-300/60">
        <div className="flex items-center gap-3">
          <div className="flex gap-1" aria-hidden="true">
            <span className="h-2 w-2 animate-bounce rounded-full bg-wizard-600 [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-wizard-600 [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-wizard-600" />
          </div>
          <div>
            <p className="text-[13px] font-medium">
              Merlin consulte le grimoire…
            </p>
            <p className="text-[11px] text-wizard-500">
              La réponse arrive automatiquement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionPanel({
  currentStep,
  onSelect,
  suggestions,
}: {
  currentStep: ScenarioStep;
  onSelect: (suggestion: string) => void;
  suggestions: string[];
}) {
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-black/10">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-slate-600">
          {buildQuestionForScenarioStep(currentStep)}
        </p>
        <p className="text-[11px] italic text-wizard-400">
          ou écris librement en bas
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            className={[
              'flex min-h-14 items-start gap-2 rounded-lg border px-3 py-2 text-left text-[12px] leading-5 transition',
              index === 0
                ? 'border-wizard-300 bg-wizard-100 text-wizard-700'
                : 'border-black/10 bg-[#f5f5f3] text-slate-700 hover:border-black/25',
            ].join(' ')}
            key={`${suggestion}-${index}`}
            onClick={() => onSelect(suggestion)}
          >
            <Icon
              name={suggestionIcon(suggestion)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              <span className="block font-medium">{suggestion}</span>
              <span className="block text-[11px] text-slate-500">
                Merlin adapte la suite.
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ScenarioDraftPreview({
  onOpenScenario,
  scenario,
}: {
  onOpenScenario: () => void;
  scenario: ScenarioSummary;
}) {
  const { data } = scenario;
  const hasActs = data.actes.length > 0;
  const hasEncounters = data.rencontres.length > 0;
  const hasSessions = Boolean(data.sessionning?.sessions.length);

  if (!hasActs && !hasEncounters && !hasSessions) {
    return null;
  }

  return (
    <section className="rounded-lg border border-black/10 bg-[#f8f7f2] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12px] font-medium text-slate-700">
          <Icon name="spark" className="h-4 w-4 text-wizard-600" />
          Ce que Merlin a préparé
        </p>
        <button
          className="flex shrink-0 items-center gap-1 rounded-full bg-wizard-600 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-wizard-700"
          onClick={onOpenScenario}
        >
          <Icon name="scenario" className="h-3.5 w-3.5" />
          Voir le détail
        </button>
      </div>

      {hasEncounters ? (
        <div className="mt-3">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-wizard-600">
            <Icon name="battle" className="h-3.5 w-3.5" />
            Rencontres proposées
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {data.rencontres.map((rencontre, index) => (
              <article
                className="rounded-lg bg-white px-3 py-2 text-[12px] leading-5 ring-1 ring-black/10"
                key={`${rencontre.acteNumero}-${rencontre.monsterId}-${index}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">
                    Acte {rencontre.acteNumero} · {rencontre.nombre} ×{' '}
                    {rencontre.monsterId}
                  </p>
                  {rencontre.carteBattleMat ? (
                    <span className="shrink-0 rounded-full bg-wizard-100 px-2 py-0.5 text-[10px] font-medium text-wizard-700">
                      Battle Mat
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  {rencontre.contexte}
                </p>
                {rencontre.carteBattleMat ? (
                  <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-wizard-600">
                    <Icon name="map" className="h-3.5 w-3.5" />
                    V{rencontre.carteBattleMat.volume} p.
                    {rencontre.carteBattleMat.pages.join('-')} ·{' '}
                    {rencontre.carteBattleMat.nom}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {hasActs ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">
              <Icon name="scenario" className="h-3.5 w-3.5" />
              Actes retenus
            </p>
            <button
              className="text-[11px] font-medium text-wizard-600 transition hover:text-wizard-700"
              onClick={onOpenScenario}
            >
              Lire tous les actes
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {data.actes.slice(0, 4).map((acte) => (
              <button
                className="rounded-lg bg-white px-3 py-2 text-left text-[11px] leading-5 ring-1 ring-black/10 transition hover:bg-wizard-100 hover:ring-wizard-300"
                key={acte.numero}
                onClick={onOpenScenario}
              >
                <p className="font-medium text-slate-900">
                  Acte {acte.numero} · {acte.titre}
                </p>
                <p className="mt-0.5 line-clamp-2 text-slate-500">
                  {acte.description}
                </p>
              </button>
            ))}
          </div>
          {data.actes.length > 4 ? (
            <p className="mt-2 text-[11px] text-slate-500">
              {data.actes.length - 4} acte
              {data.actes.length - 4 > 1 ? 's' : ''} supplémentaire
              {data.actes.length - 4 > 1 ? 's' : ''} dans l'onglet Scénario.
            </p>
          ) : null}
        </div>
      ) : null}

      {hasSessions ? (
        <div className="mt-3 rounded-lg bg-white px-3 py-2 text-[11px] leading-5 text-slate-600 ring-1 ring-black/10">
          <p className="flex items-center gap-1 font-medium text-slate-900">
            <Icon name="clock" className="h-3.5 w-3.5" />
            Découpage proposé :{' '}
            {data.sessionning?.nombreSessionsRecommande} session
            {(data.sessionning?.nombreSessionsRecommande ?? 0) > 1 ? 's' : ''} ·{' '}
            {data.sessionning?.dureeTotaleEstimeeMin} min
          </p>
        </div>
      ) : null}
    </section>
  );
}

function suggestionIcon(suggestion: string): IconName {
  const lower = suggestion.toLowerCase();
  if (lower.includes('combat') || lower.includes('action')) return 'battle';
  if (lower.includes('enquête') || lower.includes('mystère')) return 'search';
  if (lower.includes('humour')) return 'spark';
  if (lower.includes('frisson')) return 'moon';
  if (lower.includes('merveille')) return 'spark';
  if (lower.includes('explor')) return 'map';
  if (lower.includes('sauver')) return 'shield';
  if (lower.includes('objet')) return 'gem';
  return 'spark';
}

function hasChatHistory(
  scenario: ScenarioSummary | ScenarioDetail | null,
): scenario is ScenarioDetail {
  return Boolean(
    scenario &&
      'chatHistory' in scenario &&
      Array.isArray(scenario.chatHistory),
  );
}

function buildSuggestionsForScenarioStep(step?: ScenarioStep): string[] {
  switch (step) {
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
        "Retrouver l'objet avant la nuit",
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
        "Quelqu'un qui demande de l'aide",
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
    case 'STEP_1_SENSATION':
    default:
      return DEFAULT_SUGGESTIONS;
  }
}

function resolveSuggestionsForScenarioStep(input: {
  suggestions: string[];
  targetStep?: ScenarioStep;
}) {
  const normalized = normalizeSuggestions(input.suggestions);

  if (
    normalized.length > 0 &&
    !hasStrongSuggestionOverlap(
      normalized,
      buildPreviousStepSuggestions(input.targetStep),
    ) &&
    !hasSuggestionStepDrift({
      suggestions: normalized,
      targetStep: input.targetStep,
    })
  ) {
    return normalized;
  }

  return buildSuggestionsForScenarioStep(input.targetStep);
}

function buildPreviousStepSuggestions(step?: ScenarioStep) {
  switch (step) {
    case 'STEP_2_LIEU':
      return buildSuggestionsForScenarioStep('STEP_1_SENSATION');
    case 'STEP_3_QUETE':
      return buildSuggestionsForScenarioStep('STEP_2_LIEU');
    case 'STEP_4_ANTAGONISTE':
      return buildSuggestionsForScenarioStep('STEP_3_QUETE');
    case 'STEP_5_OBJECTIF_HEROS':
      return buildSuggestionsForScenarioStep('STEP_4_ANTAGONISTE');
    case 'STEP_6_ACTES':
      return buildSuggestionsForScenarioStep('STEP_5_OBJECTIF_HEROS');
    case 'STEP_7_PNJS':
      return buildSuggestionsForScenarioStep('STEP_6_ACTES');
    case 'STEP_8_DUREE':
      return buildSuggestionsForScenarioStep('STEP_7_PNJS');
    case 'STEP_9_FIN':
      return buildSuggestionsForScenarioStep('STEP_8_DUREE');
    case 'STEP_10_RECAP':
      return buildSuggestionsForScenarioStep('STEP_9_FIN');
    case 'STEP_1_SENSATION':
    default:
      return [];
  }
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
  targetStep?: ScenarioStep;
}) {
  const previousStep = getPreviousScenarioStep(input.targetStep);
  if (!input.targetStep || !previousStep) return false;

  const previousKeywords = getSuggestionKeywordsForScenarioStep(previousStep);
  const targetKeywords = getSuggestionKeywordsForScenarioStep(input.targetStep);
  const previousMatches = input.suggestions.filter((suggestion) =>
    containsAnyKeyword(suggestion, previousKeywords),
  ).length;
  const targetMatches = input.suggestions.filter((suggestion) =>
    containsAnyKeyword(suggestion, targetKeywords),
  ).length;

  return previousMatches >= Math.ceil(input.suggestions.length / 2) && targetMatches === 0;
}

function getPreviousScenarioStep(step?: ScenarioStep): ScenarioStep | null {
  const index = step ? SCENARIO_STEPS.indexOf(step) : -1;
  return index > 0 ? (SCENARIO_STEPS[index - 1] ?? null) : null;
}

function containsAnyKeyword(value: string, keywords: string[]) {
  const normalized = normalizeSuggestionKey(value);
  return keywords.some((keyword) => normalized.includes(keyword));
}

function getSuggestionKeywordsForScenarioStep(step: ScenarioStep) {
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

function buildQuestionForScenarioStep(step: ScenarioStep): string {
  switch (step) {
    case 'STEP_1_SENSATION':
      return "Quelle sensation veux-tu donner à ton aventure ?";
    case 'STEP_2_LIEU':
      return 'Où se déroule surtout cette aventure ?';
    case 'STEP_3_QUETE':
      return 'Quel est le problème central de cette aventure ?';
    case 'STEP_4_ANTAGONISTE':
      return 'Quelle est la cause du problème ?';
    case 'STEP_5_OBJECTIF_HEROS':
      return 'Que doivent réussir les héros ?';
    case 'STEP_6_ACTES':
      return "Quelles sont les grandes étapes de l'aventure ?";
    case 'STEP_7_PNJS':
      return 'Quels PNJs importants faut-il préparer ?';
    case 'STEP_8_DUREE':
      return 'Quelle durée et quel rythme veux-tu pour la partie ?';
    case 'STEP_9_FIN':
      return 'Quelle fin satisfaisante veux-tu créer ?';
    case 'STEP_10_RECAP':
      return 'Veux-tu valider ou ajuster le scénario ?';
  }
}
