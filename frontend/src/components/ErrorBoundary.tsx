import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      error,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render error', error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f0eff5] p-6 text-slate-950">
        <section className="max-w-xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/10">
          <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-rose-700">
            Erreur d'affichage
          </p>
          <h1 className="mt-2 text-2xl font-semibold">
            L'Antre n'a pas pu afficher cette page
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Recharge la page. Si l'erreur revient, copie le message ci-dessous :
          </p>
          <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-white">
            {this.state.error.message}
          </pre>
          <button
            className="mt-5 rounded-lg bg-wizard-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => window.location.reload()}
          >
            Recharger
          </button>
        </section>
      </main>
    );
  }
}
