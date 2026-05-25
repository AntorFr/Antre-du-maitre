import type { ScenarioSummary } from '@antre-du-maitre/shared';

type ScenarioSummaryPanelProps = {
  scenario: ScenarioSummary;
};

export function ScenarioSummaryPanel({
  scenario,
}: ScenarioSummaryPanelProps) {
  const { data } = scenario;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          Scénario
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{scenario.title}</h2>
      </div>

      <div className="grid gap-3">
        <SummaryRow label="Ambiance" value={data.ambiance} />
        <SummaryRow label="Lieu" value={data.lieu?.nom} />
        <SummaryRow label="Quête" value={data.quete?.phraseSimple} />
        <SummaryRow label="Antagoniste" value={data.antagoniste?.nom} />
        <SummaryRow
          label="PNJs"
          value={data.pnjs.length ? data.pnjs.map((pnj) => pnj.nom).join(', ') : undefined}
        />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        {value ?? 'Pas encore défini'}
      </p>
    </div>
  );
}
