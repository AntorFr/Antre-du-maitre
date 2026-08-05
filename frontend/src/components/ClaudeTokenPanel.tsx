import { useEffect, useState } from 'react';

import { api, ApiError } from '../lib/api';
import { Icon } from './Icon';

type PanelStep = 'idle' | 'starting' | 'code' | 'submitting';

/**
 * Panneau admin « Abonnement Claude » : pilote `claude setup-token` côté
 * backend. Génère l'URL d'autorisation à ouvrir, puis reçoit le code collé
 * par l'admin. Le token résultant reste côté serveur.
 */
export function ClaudeTokenPanel({ token }: { token: string }) {
  const [status, setStatus] = useState<{
    tokenPresent: boolean;
    savedAt: string | null;
  } | null>(null);
  const [step, setStep] = useState<PanelStep>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api
      .claudeTokenStatus(token)
      .then((result) => {
        if (!cancelled) setStatus(result);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function start() {
    setError(null);
    setStep('starting');
    setAuthorizeUrl(null);
    setCode('');

    try {
      const result = await api.claudeTokenStart(token);
      setSessionId(result.sessionId);
      setAuthorizeUrl(result.authorizeUrl);
      setStep('code');
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Impossible de démarrer la génération.',
      );
      setStep('idle');
    }
  }

  async function submitCode() {
    if (!sessionId || !code.trim()) return;

    setError(null);
    setStep('submitting');

    try {
      const result = await api.claudeTokenSubmitCode(token, {
        sessionId,
        code: code.trim(),
      });
      setStatus(result);
      setStep('idle');
      setAuthorizeUrl(null);
      setCode('');
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : "L'échange du code a échoué.",
      );
      setStep('code');
    }
  }

  async function copyUrl() {
    if (!authorizeUrl) return;

    try {
      await navigator.clipboard.writeText(authorizeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Le lien reste cliquable, la copie est un confort.
    }
  }

  return (
    <div className="mt-4 rounded-lg bg-white p-3 ring-1 ring-black/10">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-slate-700">
        <Icon name="magic" className="h-3.5 w-3.5 text-wizard-600" />
        Abonnement Claude
      </p>

      <p className="mt-1 text-[11px] leading-4 text-slate-500">
        {status?.tokenPresent
          ? `Token enregistré${
              status.savedAt
                ? ` le ${new Date(status.savedAt).toLocaleDateString('fr-FR')}`
                : ''
            } (valable 1 an).`
          : 'Aucun token : Merlin utilise la clé API ou les credentials locaux.'}
      </p>

      {step === 'idle' || step === 'starting' ? (
        <button
          className="mt-2 w-full rounded-lg bg-wizard-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-wizard-700 disabled:opacity-60"
          disabled={step === 'starting'}
          onClick={() => void start()}
        >
          {step === 'starting'
            ? 'Préparation du lien…'
            : status?.tokenPresent
              ? 'Renouveler le token'
              : 'Connecter l’abonnement'}
        </button>
      ) : null}

      {authorizeUrl && (step === 'code' || step === 'submitting') ? (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] leading-4 text-slate-600">
            1. Ouvre ce lien, connecte-toi au compte Claude et autorise :
          </p>
          <div className="flex gap-1.5">
            <a
              className="min-w-0 flex-1 truncate rounded-lg bg-wizard-100 px-3 py-2 text-[11px] font-medium text-wizard-700 ring-1 ring-wizard-300 transition hover:bg-wizard-300/40"
              href={authorizeUrl}
              rel="noreferrer"
              target="_blank"
            >
              Ouvrir la page d’autorisation
            </a>
            <button
              className="shrink-0 rounded-lg bg-[#f5f5f3] px-2.5 text-[11px] text-slate-600 ring-1 ring-black/10 transition hover:bg-black/5"
              onClick={() => void copyUrl()}
              title="Copier l’URL"
              type="button"
            >
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <p className="text-[11px] leading-4 text-slate-600">
            2. Colle ici le code affiché à la fin :
          </p>
          <input
            className="h-9 w-full rounded-lg border border-black/10 bg-[#f5f5f3] px-3 font-mono text-[11px]"
            placeholder="code d’autorisation"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <button
            className="w-full rounded-lg bg-wizard-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-wizard-700 disabled:opacity-60"
            disabled={step === 'submitting' || !code.trim()}
            onClick={() => void submitCode()}
          >
            {step === 'submitting' ? 'Échange du code…' : 'Valider le code'}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] leading-4 text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
