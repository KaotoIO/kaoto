import './Wizard.scss';

import { ChevronDown } from '@carbon/icons-react';
import { ProgressIndicator, ProgressStep } from '@carbon/react';
import clsx from 'clsx';
import { Fragment, FunctionComponent, ReactNode, useEffect, useId, useRef, useState } from 'react';

export type WizardStep = {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
  complete?: boolean;
  invalid?: boolean;
  secondaryLabel?: string;
  description?: string;
};

/**
 * The wizard is controlled: the page owns `currentIndex` and any step state.
 * Only the current step's content is mounted, so local state inside a step is lost when the step changes.
 * Keep the values the steps need in the page, for example in a form state shared by all the steps.
 */
export type WizardProps = {
  steps: ReadonlyArray<WizardStep>;
  /**
   * Index of the current step in `steps`. It is not clamped: an index outside `steps`
   * renders an empty body and the toggle text falls back to "Steps", so the page
   * must keep it in range, for example after filtering the steps.
   */
  currentIndex: number;
  onStepChange: (index: number) => void;
  /** Rendered full width under the steps and the body, usually the Back/Next buttons */
  footer: ReactNode;
  /** Accessible name of the steps navigation, for example "Import steps" */
  stepsLabel: string;
  /** Lets a page scope its own styles, for example to limit the body width */
  className?: string;
};

export const Wizard: FunctionComponent<WizardProps> = ({
  steps,
  currentIndex,
  onStepChange,
  footer,
  stepsLabel,
  className,
}) => {
  const navId = useId();
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const previousIndex = useRef(currentIndex);

  useEffect(() => {
    if (previousIndex.current === currentIndex) return;
    previousIndex.current = currentIndex;
    setIsNavExpanded(false);
    bodyRef.current?.focus();
  }, [currentIndex]);

  const currentStep = steps[currentIndex];
  const regionLabel = currentStep ? `Step ${currentIndex + 1} of ${steps.length}: ${currentStep.label}` : undefined;

  return (
    <div className={clsx('kaoto-wizard', className)}>
      <div className="kaoto-wizard__layout">
        <button
          type="button"
          className={clsx('kaoto-wizard__toggle', { 'kaoto-wizard__toggle--expanded': isNavExpanded })}
          aria-expanded={isNavExpanded}
          aria-controls={navId}
          onClick={() => {
            setIsNavExpanded((prev) => !prev);
          }}
        >
          <span className="kaoto-wizard__toggle-text">{regionLabel ?? 'Steps'}</span>
          <ChevronDown
            className={clsx('kaoto-wizard__toggle-icon', { 'kaoto-wizard__toggle-icon--expanded': isNavExpanded })}
            aria-hidden="true"
          />
        </button>

        <nav
          id={navId}
          className={clsx('kaoto-wizard__steps', { 'kaoto-wizard__steps--expanded': isNavExpanded })}
          aria-label={stepsLabel}
        >
          {/* The indicator marks every step before `currentIndex` as complete, whether or not it was done.
              Passing -1 keeps it from doing that, so a step is complete only when the page says so. */}
          <ProgressIndicator
            vertical
            currentIndex={-1}
            onChange={(index) => {
              setIsNavExpanded(false);
              onStepChange(index);
            }}
          >
            {steps.map((step, index) => (
              <ProgressStep
                key={step.id}
                current={index === currentIndex}
                label={step.label}
                disabled={step.disabled}
                complete={step.complete}
                invalid={step.invalid}
                secondaryLabel={step.secondaryLabel}
                description={step.description}
              />
            ))}
          </ProgressIndicator>
        </nav>
        <section ref={bodyRef} tabIndex={-1} className="kaoto-wizard__body" aria-label={regionLabel}>
          {currentStep && <Fragment key={currentStep.id}>{currentStep.content}</Fragment>}
        </section>
        <div className="kaoto-wizard__footer">{footer}</div>
      </div>
    </div>
  );
};
