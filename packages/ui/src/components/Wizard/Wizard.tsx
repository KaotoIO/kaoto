import './Wizard.scss';

import { ProgressIndicator, ProgressStep } from '@carbon/react';
import { FunctionComponent, ReactNode } from 'react';

export type WizardStep = {
  id: string;
  label: string;
  content: ReactNode;
};

export type WizardProps = {
  steps: ReadonlyArray<WizardStep>;
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
}) => (
  <div className={className ? `kaoto-wizard ${className}` : 'kaoto-wizard'}>
    <nav className="kaoto-wizard__steps" aria-label={stepsLabel}>
      <ProgressIndicator vertical currentIndex={currentIndex} onChange={onStepChange}>
        {steps.map((step) => (
          <ProgressStep key={step.id} label={step.label} />
        ))}
      </ProgressIndicator>
    </nav>
    <div className="kaoto-wizard__body">{steps[currentIndex]?.content}</div>
    <div className="kaoto-wizard__footer">{footer}</div>
  </div>
);
