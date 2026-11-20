import './RestDslImportWizard.scss';

import { Button } from '@carbon/react';
import { FunctionComponent, useState } from 'react';

import { Wizard, WizardStep } from '../../components/Wizard';
import { useRestDslImportWizard } from '../../hooks/useRestDslImportWizard';
import { ImportOperationsStep } from './components/ImportOperationsStep';
import { ImportResultStep } from './components/ImportResultStep';
import { ImportSourceStep } from './components/ImportSourceStep';
import { ImportSpecificationStep } from './components/ImportSpecificationStep';

const STEP_SOURCE = 0;
const STEP_OPERATIONS = 2;
const STEP_RESULT = 3;

type RestDslImportWizardProps = {
  onClose: () => void;
  onGoToDesigner: () => void;
  onOpenSettings: () => void;
};

export const RestDslImportWizard: FunctionComponent<RestDslImportWizardProps> = ({
  onClose,
  onGoToDesigner,
  onOpenSettings,
}) => {
  const wizard = useRestDslImportWizard();
  const [activeStep, setActiveStep] = useState(STEP_SOURCE);

  const isSourceStep = activeStep === STEP_SOURCE;
  const isOperationsStep = activeStep === STEP_OPERATIONS;
  const isResultStep = activeStep === STEP_RESULT;

  const handleClose = () => {
    wizard.resetImportWizard();
    onClose();
  };

  const handleGoToDesigner = () => {
    wizard.resetImportWizard();
    onGoToDesigner();
  };

  /** Validation errors keep the user on Operations; an unexpected exception leads to the failure view */
  const handleImport = () => {
    wizard.setImportFailed(false);
    try {
      if (!wizard.handleImportOpenApi()) {
        return;
      }
    } catch (error) {
      console.error('Failed to import the OpenAPI specification:', error);
      wizard.setImportFailed(true);
    }
    setActiveStep(STEP_RESULT);
  };

  const handleNext = () => {
    if (isOperationsStep) {
      handleImport();
      return;
    }
    setActiveStep((step) => step + 1);
  };

  const isNextDisabled =
    !wizard.isOpenApiParsed || (isOperationsStep && !wizard.importCreateRest && !wizard.importCreateRoutes);

  const importFailed = wizard.importFailed;
  const importSucceeded = wizard.importStatus?.type === 'success';
  const hasSpecification = wizard.openApiSpecText.trim() !== '';
  const specificationParsed = wizard.isOpenApiParsed;

  // Progress comes from the wizard state: opening a step does not mean it was completed
  const steps: WizardStep[] = [
    {
      id: 'source',
      label: 'Import source',
      complete: specificationParsed,
      content: <ImportSourceStep wizard={wizard} onOpenSettings={onOpenSettings} />,
    },
    {
      id: 'specification',
      label: 'Specification',
      complete: specificationParsed,
      // An edited document is no longer parsed, but it must stay reachable so it can be parsed again.
      // Once imported, Result is the last step: going back would let the same import run twice.
      disabled: !hasSpecification || importSucceeded,
      content: <ImportSpecificationStep wizard={wizard} />,
    },
    {
      id: 'operations',
      label: 'Operations',
      complete: importSucceeded,
      disabled: !specificationParsed || importSucceeded,
      invalid: importFailed,
      content: <ImportOperationsStep wizard={wizard} />,
    },
    {
      id: 'result',
      label: 'Result',
      complete: importSucceeded,
      invalid: importFailed,
      disabled: !importSucceeded && !importFailed,
      content: <ImportResultStep status={wizard.importStatus} failed={importFailed} outputs={wizard.importedOutputs} />,
    },
  ];

  const renderFooter = () => {
    if (isResultStep && importFailed) {
      return (
        <>
          <Button
            kind="secondary"
            className="rest-dsl-import-footer-button"
            onClick={() => {
              setActiveStep(STEP_OPERATIONS);
            }}
          >
            Back
          </Button>
          <Button kind="secondary" className="rest-dsl-import-footer-button" onClick={handleGoToDesigner}>
            Go to Designer
          </Button>
          <Button kind="primary" className="rest-dsl-import-footer-button" onClick={handleClose}>
            Go to Rest Editor
          </Button>
        </>
      );
    }

    if (isResultStep) {
      return (
        <>
          <Button kind="secondary" className="rest-dsl-import-footer-button" onClick={handleGoToDesigner}>
            Go to Designer
          </Button>
          <Button kind="primary" className="rest-dsl-import-footer-button" onClick={handleClose}>
            Go to Rest Editor
          </Button>
        </>
      );
    }

    return (
      <>
        <Button
          kind="secondary"
          className="rest-dsl-import-footer-button"
          disabled={isSourceStep}
          onClick={() => {
            setActiveStep((step) => step - 1);
          }}
        >
          Back
        </Button>
        <Button kind="primary" className="rest-dsl-import-footer-button" disabled={isNextDisabled} onClick={handleNext}>
          {isOperationsStep ? 'Import' : 'Next'}
        </Button>
      </>
    );
  };

  return (
    <Wizard
      className="rest-dsl-import-wizard"
      stepsLabel="Import steps"
      steps={steps}
      currentIndex={activeStep}
      onStepChange={setActiveStep}
      footer={renderFooter()}
    />
  );
};
