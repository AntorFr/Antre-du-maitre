import { SCENARIO_STEPS, type ScenarioStep } from '@antre-du-maitre/shared';

import { STEP_LABELS } from '../constants/scenario';
import { Icon } from './Icon';

type ProgressStepsProps = {
  currentStep: ScenarioStep;
  variant?: 'vertical' | 'horizontal';
};

export function ProgressSteps({
  currentStep,
  variant = 'vertical',
}: ProgressStepsProps) {
  const currentIndex = SCENARIO_STEPS.indexOf(currentStep);

  if (variant === 'horizontal') {
    return (
      <ol className="flex items-center bg-[#f5f5f3] px-4 py-2">
        {SCENARIO_STEPS.map((step, index) => {
          const state =
            index < currentIndex
              ? 'done'
              : index === currentIndex
                ? 'active'
                : 'todo';

          return (
            <li className="flex min-w-0 flex-1 items-center" key={step}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <span
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                    state === 'done'
                      ? 'border-wizard-300 bg-wizard-100 text-wizard-700'
                      : state === 'active'
                        ? 'border-wizard-600 bg-wizard-600 text-white'
                        : 'border-black/10 bg-white text-slate-400',
                  ].join(' ')}
                >
                  {state === 'done' ? (
                    <Icon name="check" className="h-3.5 w-3.5" />
                  ) : state === 'active' ? (
                    <Icon name="spark" className="h-3.5 w-3.5" />
                  ) : null}
                </span>
                <span
                  className={[
                    'max-w-14 truncate text-center text-[9px]',
                    state === 'active'
                      ? 'font-medium text-wizard-600'
                      : 'text-slate-500',
                  ].join(' ')}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>
              {index < SCENARIO_STEPS.length - 1 ? (
                <div className="mb-4 h-px flex-1 bg-black/10" />
              ) : null}
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="space-y-3">
      {SCENARIO_STEPS.map((step, index) => {
        const state =
          index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'active'
              : 'todo';

        return (
          <li className="flex items-center gap-3" key={step}>
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium',
                state === 'done'
                  ? 'bg-wizard-100 text-wizard-700'
                  : state === 'active'
                    ? 'bg-wizard-600 text-white'
                    : 'bg-slate-100 text-slate-400',
              ].join(' ')}
            >
              {state === 'done' ? (
                <Icon name="check" className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </span>
            <span
              className={
                state === 'active'
                  ? 'font-medium text-wizard-700'
                  : 'text-slate-500'
              }
            >
              {STEP_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
