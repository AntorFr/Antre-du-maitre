import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wrapper minimal autour de la Web Speech API (SpeechRecognition), disponible
 * sur Safari iPad via `webkitSpeechRecognition`. La reconnaissance se fait
 * côté navigateur : aucun appel serveur, aucune donnée envoyée à un tiers.
 */

type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
};
type SpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
};
type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

interface MinimalSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => MinimalSpeechRecognition;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function useVoiceInput(options: {
  lang?: string;
  onTranscript: (transcript: string, isFinal: boolean) => void;
}) {
  const { lang = 'fr-FR', onTranscript } = options;
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported] = useState(() => getSpeechRecognitionConstructor() !== null);

  // On garde une référence à jour du callback pour ne pas recréer `start`.
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      return;
    }

    recognitionRef.current?.abort();

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let transcript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript ?? '';
      }

      const lastResult = event.results[event.results.length - 1];
      onTranscriptRef.current(transcript.trim(), Boolean(lastResult?.isFinal));
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [lang]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { isSupported, isListening, start, stop, toggle };
}
