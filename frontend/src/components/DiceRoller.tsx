import { useEffect, useRef, useState } from 'react';

import { Icon } from './Icon';

// Lanceur de dés plein écran (d4 → d100), pensé pour jouer en mobilité :
// le dé culbute (chiffres qui défilent), atterrit avec un rebond et une
// petite vibration. Aucune dépendance : SVG + keyframes CSS (styles.css).

const DICE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;

type DieSides = (typeof DICE_SIDES)[number];

type RollPhase = 'idle' | 'rolling' | 'settled';

type RollRecord = {
  sides: DieSides;
  value: number;
};

const ROLL_DURATION_MS = 950;
const FLICKER_INTERVAL_MS = 70;

function rollDie(sides: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return ((buffer[0] ?? Math.floor(Math.random() * 2 ** 32)) % sides) + 1;
}

export function DiceRoller({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [sides, setSides] = useState<DieSides>(20);
  const [value, setValue] = useState<number | null>(null);
  const [phase, setPhase] = useState<RollPhase>('idle');
  const [history, setHistory] = useState<RollRecord[]>([]);
  const flickerRef = useRef<number | null>(null);
  const settleRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (flickerRef.current !== null) window.clearInterval(flickerRef.current);
      if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    };
  }, []);

  if (!open) {
    return null;
  }

  function roll(nextSides: DieSides) {
    if (phase === 'rolling') return;

    setSides(nextSides);
    setPhase('rolling');
    setValue(rollDie(nextSides));

    // Pendant la culbute, le chiffre défile pour vendre l'effet.
    flickerRef.current = window.setInterval(() => {
      setValue(rollDie(nextSides));
    }, FLICKER_INTERVAL_MS);

    settleRef.current = window.setTimeout(() => {
      if (flickerRef.current !== null) window.clearInterval(flickerRef.current);
      const finalValue = rollDie(nextSides);

      setValue(finalValue);
      setPhase('settled');
      setHistory((current) =>
        [{ sides: nextSides, value: finalValue }, ...current].slice(0, 8),
      );
      navigator.vibrate?.(finalValue === nextSides ? [30, 60, 30] : 35);
    }, ROLL_DURATION_MS);
  }

  const isCrit = phase === 'settled' && value === sides;
  const isFumble = phase === 'settled' && value === 1 && sides !== 100;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[radial-gradient(ellipse_at_top,#3b2f7d_0%,#1d1740_55%,#120e29_100%)] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between px-5 py-4">
        <p className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.18em] text-wizard-300">
          <Icon name="dice" className="h-5 w-5" />
          Lancer de dés
        </p>
        <button
          className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-medium text-wizard-100 transition hover:bg-white/20"
          onClick={onClose}
          type="button"
        >
          Fermer
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6">
        <button
          className={[
            'dice-die relative outline-none',
            phase === 'rolling' ? 'dice-rolling' : '',
            phase === 'settled' ? 'dice-settled' : '',
            isCrit ? 'dice-crit' : '',
          ].join(' ')}
          disabled={phase === 'rolling'}
          onClick={() => roll(sides)}
          title="Relancer"
          type="button"
        >
          <DieShape sides={sides} />
          <span
            className={[
              'absolute inset-0 flex items-center justify-center font-bold text-white',
              sides === 4 ? 'pt-8' : '',
              value === null
                ? 'text-[30px]'
                : value >= 100
                  ? 'text-[38px]'
                  : 'text-[52px]',
            ].join(' ')}
          >
            {value ?? `d${sides}`}
          </span>
        </button>

        <p
          className={[
            'h-6 text-[15px] font-semibold tracking-wide',
            isCrit
              ? 'text-amber-300'
              : isFumble
                ? 'text-rose-300'
                : 'text-wizard-300',
          ].join(' ')}
        >
          {phase === 'rolling'
            ? 'Le dé roule…'
            : isCrit
              ? 'Critique ! ✨'
              : isFumble
                ? 'Échec critique…'
                : phase === 'settled'
                  ? `d${sides} → ${value}`
                  : 'Touche le dé ou choisis-en un.'}
        </p>

        {history.length > 0 ? (
          <div className="flex max-w-full gap-1.5 overflow-x-auto px-2">
            {history.map((record, index) => (
              <span
                className={[
                  'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                  index === 0
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-wizard-300',
                ].join(' ')}
                key={`${record.sides}-${record.value}-${index}`}
              >
                d{record.sides} · {record.value}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-6 pt-2">
        {DICE_SIDES.map((candidate) => (
          <button
            className={[
              'min-h-11 rounded-xl px-4 text-[15px] font-semibold transition',
              candidate === sides
                ? 'bg-wizard-600 text-white shadow-[0_2px_12px_rgba(83,74,183,0.6)]'
                : 'bg-white/10 text-wizard-100 hover:bg-white/20',
            ].join(' ')}
            disabled={phase === 'rolling'}
            key={candidate}
            onClick={() => roll(candidate)}
            type="button"
          >
            d{candidate}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Silhouette SVG du dé selon le nombre de faces (formes classiques). */
function DieShape({ sides }: { sides: DieSides }) {
  return (
    <svg
      aria-hidden
      className="h-44 w-44 drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
      viewBox="0 0 120 120"
    >
      <defs>
        <linearGradient id="dice-fill" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#8d83f2" />
          <stop offset="100%" stopColor="#534ab7" />
        </linearGradient>
      </defs>
      <g
        fill="url(#dice-fill)"
        stroke="rgba(255,255,255,0.4)"
        strokeLinejoin="round"
        strokeWidth="2.5"
      >
        {sides === 4 ? (
          <polygon points="60,10 112,104 8,104" />
        ) : sides === 6 ? (
          <rect height="94" rx="16" width="94" x="13" y="13" />
        ) : sides === 8 ? (
          <polygon points="60,6 114,60 60,114 6,60" />
        ) : sides === 10 || sides === 100 ? (
          <polygon points="60,4 112,50 60,116 8,50" />
        ) : sides === 12 ? (
          <polygon points="60,6 113.4,44.8 93,107.5 27,107.5 6.6,44.8" />
        ) : (
          <polygon points="60,4 108.5,32 108.5,88 60,116 11.5,88 11.5,32" />
        )}
        {sides === 20 ? (
          <polygon
            fill="none"
            points="60,28 88,78 32,78"
            strokeWidth="1.6"
          />
        ) : null}
      </g>
    </svg>
  );
}
