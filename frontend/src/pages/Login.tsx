import type { FormEvent } from 'react';
import { useState } from 'react';

import { Icon, type IconName } from '../components/Icon';
import { ApiError } from '../lib/api';

type LoginProps = {
  onLogin: (input: { username: string; password: string }) => Promise<void>;
};

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('merlin');
  const [password, setPassword] = useState('merlin12345');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onLogin({
        username,
        password,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiError
          ? caughtError.message
          : 'Connexion impossible pour le moment.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f0eff5] p-3 text-slate-950 md:p-6">
      <section className="flex h-[calc(100vh-1.5rem)] min-h-[560px] w-full max-w-[1120px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_4px_32px_rgba(0,0,0,0.10)] ring-1 ring-black/10 md:h-[calc(100vh-3rem)]">
        <header className="flex h-12 shrink-0 items-center gap-3 bg-wizard-900 px-4 text-wizard-100">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-wizard-300 bg-wizard-600 text-sm">
            <Icon name="magic" className="h-4 w-4" />
          </div>
          <div className="truncate text-[15px] font-medium">
            L'Antre du Maître
            <span className="ml-1 text-[11px] font-normal text-wizard-300">
              · CoF Mini
            </span>
          </div>
          <div className="flex-1" />
          <div className="rounded-full bg-wizard-600 px-3 py-1 text-[11px] text-wizard-100">
            Connexion
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-[1fr_28rem] overflow-hidden">
          <section className="flex min-w-0 flex-col justify-center bg-wizard-950 px-10 py-8 text-wizard-100">
            <div className="relative flex h-[112px] w-[112px] items-center justify-center">
              <div className="absolute h-[112px] w-[112px] rounded-full border border-wizard-600/40" />
              <div className="absolute h-[92px] w-[92px] rounded-full border border-wizard-400/50" />
              <div className="z-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-wizard-300 bg-wizard-600 text-4xl">
                <Icon name="magic" className="h-9 w-9" />
              </div>
            </div>

            <p className="mt-8 text-[12px] uppercase tracking-[0.25em] text-wizard-300">
              CoF Mini
            </p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight">
              L'Antre du Maître
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-wizard-300">
              Un atelier d'aventures où Merlin aide à inventer, préparer et
              faire vivre un monde de jeu sur iPad.
            </p>

            <div className="mt-8 grid max-w-xl grid-cols-3 gap-2">
              <FeatureCard icon="magic" label="Créer" />
              <FeatureCard icon="scenario" label="Scénario" />
              <FeatureCard icon="world" label="Monde" />
            </div>
          </section>

          <section className="flex items-center justify-center bg-white p-8">
            <form
              className="w-full rounded-xl bg-[#f5f5f3] p-5 ring-1 ring-black/10"
              onSubmit={handleSubmit}
            >
              <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-wizard-600">
                Connexion
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Entrer dans l'antre
              </h2>
              <p className="mt-2 text-[13px] leading-6 text-slate-500">
                Chaque enfant retrouve son monde et ses scénarios. L'admin peut
                suivre et modifier tous les mondes.
              </p>

              <label className="mt-6 block text-[13px] font-medium text-slate-700">
                Nom d'utilisateur
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-4 text-[14px] outline-none ring-wizard-300 transition focus:ring-4"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </label>

              <label className="mt-4 block text-[13px] font-medium text-slate-700">
                Mot de passe
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-4 text-[14px] outline-none ring-wizard-300 transition focus:ring-4"
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {error ? (
                <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
                  {error}
                </p>
              ) : null}

              <button
                className="mt-5 h-11 w-full rounded-lg bg-wizard-600 px-4 text-[13px] font-medium text-white transition hover:bg-wizard-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Connexion…' : 'Se connecter'}
              </button>

              <div className="mt-4 rounded-lg bg-white px-4 py-3 text-[12px] leading-5 text-slate-500 ring-1 ring-black/10">
                Dev : <span className="font-medium text-slate-700">merlin</span>{' '}
                / <span className="font-medium text-slate-700">merlin12345</span>
                <br />
                Admin : <span className="font-medium text-slate-700">admin</span>{' '}
                / <span className="font-medium text-slate-700">admin12345</span>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-3 py-3 text-center ring-1 ring-white/10">
      <div className="flex justify-center text-wizard-100">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <p className="mt-1 text-[11px] text-wizard-300">{label}</p>
    </div>
  );
}
