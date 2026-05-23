import type { ScenarioSummary } from '@antre-du-maitre/shared';

type ScenarioCardProps = {
  scenario: ScenarioSummary;
};

export function ScenarioCard({ scenario }: ScenarioCardProps) {
  const { data } = scenario;

  return (
    <article className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-wizard-600">
            {scenario.status}
          </p>
          <h3 className="mt-2 text-2xl font-semibold">{scenario.title}</h3>
        </div>
        {data.sessionning ? (
          <span className="rounded-full bg-wizard-100 px-3 py-1 text-sm font-medium text-wizard-700">
            ~{data.sessionning.dureeTotaleEstimeeMin} min
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <Field label="Ambiance" value={data.ambiance} />
        <Field label="Lieu" value={data.lieu?.nom} />
      </div>

      <Field className="mt-3" label="Quête" value={data.quete} />

      {data.actes.length ? (
        <div className="mt-5">
          <p className="text-sm font-medium text-slate-500">Actes</p>
          <div className="mt-3 space-y-2">
            {data.actes.map((acte) => (
              <div
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                key={acte.numero}
              >
                <span className="font-medium">
                  Acte {acte.numero} — {acte.titre}
                </span>{' '}
                · {acte.dureeEstimeeMin} min
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function Field({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-slate-50 p-4 ${className}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {value ?? 'Pas encore défini'}
      </p>
    </div>
  );
}

