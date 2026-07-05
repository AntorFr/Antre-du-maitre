import { Icon } from './Icon';
import { useVoiceInput } from '../hooks/useVoiceInput';

const BASE_CLASS =
  'flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/15 bg-[#f5f5f3] text-slate-500 transition hover:bg-white hover:text-wizard-700 disabled:opacity-50';

const LISTENING_CLASS =
  '!border-rose-300 !bg-rose-100 !text-rose-600 animate-pulse';

/**
 * Bouton micro qui dicte le texte reconnu dans le champ de saisie via la Web
 * Speech API. Ne s'affiche pas si le navigateur ne supporte pas la dictée.
 */
export function MicButton({
  disabled,
  onTranscript,
  className,
}: {
  disabled?: boolean;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  className?: string;
}) {
  const { isSupported, isListening, toggle } = useVoiceInput({ onTranscript });

  if (!isSupported) {
    return null;
  }

  return (
    <button
      className={[
        className ?? BASE_CLASS,
        isListening ? LISTENING_CLASS : '',
      ].join(' ')}
      disabled={disabled}
      onClick={toggle}
      title={isListening ? 'Arrêter la dictée' : 'Répondre au micro'}
      type="button"
    >
      <Icon name={isListening ? 'stop' : 'mic'} className="h-4 w-4" />
    </button>
  );
}
