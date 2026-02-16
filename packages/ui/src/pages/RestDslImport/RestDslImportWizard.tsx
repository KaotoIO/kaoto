import './RestDslImportWizard.scss';

import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  Radio,
  TextArea,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
} from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, useCallback } from 'react';

import { ApicurioImportSource, FileImportSource, UriImportSource } from './components';
import { ImportOperation } from './RestDslImportTypes';
import { useRestDslImportWizard } from './useRestDslImportWizard';

type ImportWizardFooterProps = {
  isSourceStep: boolean;
  isOperationsStep: boolean;
  isResultStep: boolean;
  isOpenApiParsed: boolean;
  importCreateRest: boolean;
  importCreateRoutes: boolean;
  onBack: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onNext: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onFinish: () => boolean;
  onFinishSuccess: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onClose: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onGoToDesigner: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
};

type WizardFooterRenderParams = {
  activeStep: { id?: string | number };
  goToNextStep: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  goToPrevStep: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  close: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
};

const ImportWizardFooter: FunctionComponent<ImportWizardFooterProps> = ({
  isSourceStep,
  isOperationsStep,
  isResultStep,
  isOpenApiParsed,
  importCreateRest,
  importCreateRoutes,
  onBack,
  onNext,
  onFinish,
  onFinishSuccess,
  onClose,
  onGoToDesigner,
}) => {
  const handleNextClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (isOperationsStep) {
      const ok = onFinish();
      if (ok) {
        await onFinishSuccess(event);
      }
      return;
    }
    await onNext(event);
  };

  const isNextDisabled =
    (isSourceStep && !isOpenApiParsed) ||
    (isOperationsStep && (!isOpenApiParsed || (!importCreateRest && !importCreateRoutes)));

  return (
    <WizardFooterWrapper className="rest-dsl-import-footer">
      {!isResultStep && (
        <Button variant="secondary" onClick={onBack} isDisabled={isSourceStep}>
          Back
        </Button>
      )}
      {isResultStep ? (
        <>
          <Button
            variant="secondary"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onGoToDesigner(event);
            }}
          >
            Go to Designer
          </Button>
          <Button variant="primary" onClick={onClose}>
            Go to Rest Editor
          </Button>
        </>
      ) : (
        <Button variant="primary" onClick={handleNextClick} isDisabled={isNextDisabled}>
          {isOperationsStep ? 'Import' : 'Next'}
        </Button>
      )}
    </WizardFooterWrapper>
  );
};

const renderImportWizardFooter = (
  params: WizardFooterRenderParams,
  footerState: Omit<
    ImportWizardFooterProps,
    | 'isSourceStep'
    | 'isOperationsStep'
    | 'isResultStep'
    | 'onBack'
    | 'onNext'
    | 'onFinish'
    | 'onClose'
    | 'onFinishSuccess'
  > & {
    onFinish: () => boolean;
    onClose: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
    onGoToDesigner: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  },
) => {
  const isSourceStep = params.activeStep.id === 'source';
  const isOperationsStep = params.activeStep.id === 'operations';
  const isResultStep = params.activeStep.id === 'result';

  return (
    <ImportWizardFooter
      isSourceStep={isSourceStep}
      isOperationsStep={isOperationsStep}
      isResultStep={isResultStep}
      isOpenApiParsed={footerState.isOpenApiParsed}
      importCreateRest={footerState.importCreateRest}
      importCreateRoutes={footerState.importCreateRoutes}
      onBack={params.goToPrevStep}
      onFinish={footerState.onFinish}
      onFinishSuccess={params.goToNextStep}
      onClose={footerState.onClose}
      onGoToDesigner={footerState.onGoToDesigner}
      onNext={params.goToNextStep}
    />
  );
};

type RestDslImportWizardProps = {
  onClose: () => void;
  onGoToDesigner: () => void;
};

export const RestDslImportWizard: FunctionComponent<RestDslImportWizardProps> = ({ onClose, onGoToDesigner }) => {
  const wizard = useRestDslImportWizard();

  const handleClose = useCallback(() => {
    wizard.resetImportWizard();
    onClose();
  }, [wizard, onClose]);

  const handleGoToDesigner = useCallback(() => {
    wizard.resetImportWizard();
    onGoToDesigner();
  }, [wizard, onGoToDesigner]);

  const renderOperationCheckbox = (operation: ImportOperation) => (
    <Checkbox
      key={`${operation.operationId}-${operation.method}-${operation.path}`}
      id={`rest-openapi-${operation.operationId}-${operation.method}`}
      label={`${operation.method.toUpperCase()} ${operation.path}${operation.routeExists ? ' - Route exists' : ''}`}
      isChecked={operation.routeExists ? false : operation.selected}
      isDisabled={operation.routeExists}
      onChange={(_event, checked) =>
        wizard.handleToggleOperation(operation.operationId, operation.method, operation.path, checked)
      }
    />
  );

  return (
    <Wizard
      onClose={handleClose}
      className="rest-dsl-import-wizard"
      footer={(activeStep, goToNextStep, goToPrevStep, close) =>
        renderImportWizardFooter(
          { activeStep, goToNextStep, goToPrevStep, close },
          {
            isOpenApiParsed: wizard.isOpenApiParsed,
            importCreateRest: wizard.importCreateRest,
            importCreateRoutes: wizard.importCreateRoutes,
            onFinish: wizard.handleImportOpenApi,
            onClose: handleClose,
            onGoToDesigner: handleGoToDesigner,
          },
        )
      }
    >
      <WizardStep name="Import source" id="source">
        <Form>
          <FormGroup label="Choose import source" fieldId="rest-openapi-import-source">
            <Radio
              id="rest-openapi-import-file"
              name="rest-openapi-import-source"
              label="Upload file"
              isChecked={wizard.importSource === 'file'}
              onChange={() => wizard.handleImportSourceChange('file')}
            />
            {wizard.importSource === 'file' && <FileImportSource onSchemaLoaded={wizard.handleSchemaLoaded} />}

            <Radio
              id="rest-openapi-import-uri"
              name="rest-openapi-import-source"
              label="Import from URI"
              isChecked={wizard.importSource === 'uri'}
              onChange={() => wizard.handleImportSourceChange('uri')}
            />
            {wizard.importSource === 'uri' && <UriImportSource onSchemaLoaded={wizard.handleSchemaLoaded} />}

            <Radio
              id="rest-openapi-import-apicurio"
              name="rest-openapi-import-source"
              label="Import from Apicurio"
              isChecked={wizard.importSource === 'apicurio'}
              onChange={() => wizard.handleImportSourceChange('apicurio')}
            />
            {wizard.importSource === 'apicurio' && (
              <ApicurioImportSource
                registryUrl={wizard.apicurioRegistryUrl}
                onSchemaLoaded={wizard.handleSchemaLoaded}
              />
            )}
          </FormGroup>
        </Form>
      </WizardStep>
      <WizardStep name="Operations" id="operations">
        <Form>
          <FormGroup label="OpenAPI Specification" fieldId="rest-openapi-spec">
            <TextArea
              id="rest-openapi-spec"
              aria-label="rest-openapi-spec"
              value={wizard.openApiSpecText}
              onChange={(_event, value) => wizard.setOpenApiSpecText(value)}
              resizeOrientation="vertical"
              rows={6}
            />
          </FormGroup>
          <div className="rest-dsl-import-actions">
            <Button variant="secondary" onClick={wizard.handleParseOpenApiSpec}>
              Parse Specification
            </Button>
            {wizard.importStatus?.type === 'error' && (
              <span className="rest-dsl-import-error">{wizard.importStatus.message}</span>
            )}
          </div>
          <div className="rest-dsl-import-options">
            <Checkbox
              id="rest-openapi-create-rest"
              label="Create Rest DSL operations"
              isChecked={wizard.importCreateRest}
              onChange={(_event, checked) => wizard.setImportCreateRest(checked)}
            />
            <Checkbox
              id="rest-openapi-create-routes"
              label="Create routes with direct endpoints"
              isChecked={wizard.importCreateRoutes}
              onChange={(_event, checked) => wizard.setImportCreateRoutes(checked)}
            />
          </div>
          {wizard.importOperations.length > 0 && (
            <div className="rest-dsl-import-list">
              <Checkbox
                id="rest-openapi-select-all"
                label="Select all operations"
                isChecked={wizard.importSelectAll}
                onChange={(_event, checked) => wizard.handleToggleSelectAllOperations(checked)}
              />
              <div className="rest-dsl-import-list-scroll">
                {wizard.importOperations.map((operation) => (
                  <div
                    key={`${operation.operationId}-${operation.method}-${operation.path}`}
                    className="rest-dsl-import-row"
                  >
                    {renderOperationCheckbox(operation)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Form>
      </WizardStep>
      <WizardStep name="Result" id="result">
        <Alert
          variant={wizard.importStatus?.type === 'success' ? 'success' : 'danger'}
          title={wizard.importStatus?.message ?? 'No import results yet.'}
          isInline
        />
      </WizardStep>
    </Wizard>
  );
};
