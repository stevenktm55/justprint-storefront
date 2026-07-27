"use client";

import {
  STEP_LABELS,
  TOTAL_STEPS,
  type ConfiguratorStep,
} from "@/types/configurator";

interface ProgressBarProps {
  currentStep: ConfiguratorStep;
}

const STEP_ORDER: ConfiguratorStep[] = [1, 2, 3, 4, 5];

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="shrink-0 border-b border-[var(--rm-border)] bg-[var(--rm-surface)] px-4 py-2">
      <div className="mx-auto flex max-w-[var(--rm-max-width)] flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--rm-text-muted)]">
            Étape {currentStep} sur {TOTAL_STEPS}
          </p>
          <p className="text-xs font-bold text-[var(--rm-text)] lg:hidden">
            {STEP_LABELS[currentStep]}
          </p>
        </div>

        <div
          className="h-1.5 overflow-hidden rounded-full bg-[var(--rm-bg)]"
          role="progressbar"
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`Progression : étape ${currentStep} sur ${TOTAL_STEPS}`}
        >
          <div
            className="h-full rounded-full bg-[var(--rm-accent)] transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="hidden gap-1 lg:grid lg:grid-cols-5">
          {STEP_ORDER.map((stepNumber) => {
            const active = stepNumber === currentStep;
            const done = stepNumber < currentStep;

            return (
              <li
                key={stepNumber}
                className={`truncate text-center text-[11px] font-semibold uppercase tracking-wide ${
                  active
                    ? "text-[var(--rm-accent)]"
                    : done
                      ? "text-[var(--rm-text)]"
                      : "text-[var(--rm-text-muted)]"
                }`}
              >
                {STEP_LABELS[stepNumber]}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
