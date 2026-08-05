import {
  SCENARIO_SECTIONS,
  type ScenarioSection,
  type ScenarioSectionMap,
} from '@antre-du-maitre/shared';

import { SECTION_LABELS } from '../constants/scenario';
import { Icon } from './Icon';

type SectionChecklistProps = {
  sections: ScenarioSectionMap;
  /** Section conseillée par Merlin (mise en avant visuelle). */
  focusSection?: ScenarioSection | null;
  /** Clic sur une section : orienter la discussion dessus. */
  onSelectSection?: (section: ScenarioSection) => void;
  disabled?: boolean;
};

/**
 * Checklist des sections du scénario : chaque pastille reflète l'état dérivé
 * des données (vide / en cours / complet), sans ordre imposé. Cliquer sur une
 * section demande à Merlin de travailler dessus.
 */
export function SectionChecklist({
  sections,
  focusSection = null,
  onSelectSection,
  disabled = false,
}: SectionChecklistProps) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto bg-[#f5f5f3] px-4 py-2">
      {SCENARIO_SECTIONS.map((section) => {
        const status = sections[section];
        const isFocus = section === focusSection;

        return (
          <li className="min-w-0 flex-1" key={section}>
            <button
              className="flex w-full min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1 transition enabled:hover:bg-black/5 disabled:cursor-default"
              disabled={disabled || !onSelectSection}
              onClick={() => onSelectSection?.(section)}
              title={
                status === 'COMPLETE'
                  ? `${SECTION_LABELS[section]} : complet — clique pour retoucher`
                  : `${SECTION_LABELS[section]} : à travailler — clique pour en parler`
              }
              type="button"
            >
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                  status === 'COMPLETE'
                    ? 'border-wizard-300 bg-wizard-100 text-wizard-700'
                    : isFocus
                      ? 'border-wizard-600 bg-wizard-600 text-white'
                      : status === 'PARTIAL'
                        ? 'border-wizard-300 bg-white text-wizard-600'
                        : 'border-black/10 bg-white text-slate-400',
                ].join(' ')}
              >
                {status === 'COMPLETE' ? (
                  <Icon name="check" className="h-3.5 w-3.5" />
                ) : isFocus ? (
                  <Icon name="spark" className="h-3.5 w-3.5" />
                ) : status === 'PARTIAL' ? (
                  <Icon name="note" className="h-3.5 w-3.5" />
                ) : null}
              </span>
              <span
                className={[
                  'max-w-16 truncate text-center text-[9px]',
                  isFocus
                    ? 'font-medium text-wizard-600'
                    : status === 'COMPLETE'
                      ? 'text-wizard-700'
                      : 'text-slate-500',
                ].join(' ')}
              >
                {SECTION_LABELS[section]}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
