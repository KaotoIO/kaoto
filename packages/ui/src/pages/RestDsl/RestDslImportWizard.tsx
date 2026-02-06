import {
  Alert,
  Button,
  Checkbox,
  Form,
  FormGroup,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
  Radio,
  SearchInput,
  TextArea,
  TextInput,
  Wizard,
  WizardFooterWrapper,
  WizardStep,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { ChangeEvent, FunctionComponent, MouseEvent, RefObject } from 'react';

import { ApicurioArtifact, ImportLoadSource, ImportOperation, ImportSourceOption, RestVerb } from './restDslTypes';

type ImportWizardFooterProps = {
  isSourceStep: boolean;
  isOperationsStep: boolean;
  isResultStep: boolean;
  isImportBusy: boolean;
  isOpenApiParsed: boolean;
  importCreateRest: boolean;
  importCreateRoutes: boolean;
  onBack: (event: MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  onNext: (event: MouseEvent<HTMLButtonElement>) => Promise<boolean>;
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
  isImportBusy,
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

  return (
    <WizardFooterWrapper className="rest-dsl-page-import-footer">
      {!isResultStep && (
        <Button variant="secondary" onClick={onBack} isDisabled={isSourceStep || isImportBusy}>
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
        <Button
          variant="primary"
          onClick={handleNextClick}
          isDisabled={
            isImportBusy || (isOperationsStep && (!isOpenApiParsed || (!importCreateRest && !importCreateRoutes)))
          }
        >
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
    onNext: (event: MouseEvent<HTMLButtonElement>) => Promise<boolean>;
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
      isImportBusy={footerState.isImportBusy}
      isOpenApiParsed={footerState.isOpenApiParsed}
      importCreateRest={footerState.importCreateRest}
      importCreateRoutes={footerState.importCreateRoutes}
      onBack={(event) => params.goToPrevStep(event)}
      onFinish={footerState.onFinish}
      onFinishSuccess={(event) => params.goToNextStep(event)}
      onClose={footerState.onClose}
      onGoToDesigner={footerState.onGoToDesigner}
      onNext={async (event) => {
        const ok = await footerState.onNext(event);
        if (ok) {
          await params.goToNextStep(event);
        }
        return ok;
      }}
    />
  );
};

type RestDslImportWizardProps = {
  isOpen: boolean;
  apicurioRegistryUrl?: string;
  importSource: ImportSourceOption;
  openApiSpecUri: string;
  openApiSpecText: string;
  openApiError: string;
  apicurioError: string;
  apicurioSearch: string;
  filteredApicurioArtifacts: ApicurioArtifact[];
  selectedApicurioId: string;
  isApicurioLoading: boolean;
  isImportBusy: boolean;
  isOpenApiParsed: boolean;
  importCreateRest: boolean;
  importCreateRoutes: boolean;
  importSelectAll: boolean;
  importOperations: ImportOperation[];
  importStatus: { type: 'success' | 'error'; message: string } | null;
  openApiLoadSource: ImportLoadSource;
  openApiFileInputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onImportSourceChange: (source: ImportSourceOption) => void;
  onOpenApiSpecUriChange: (value: string) => void;
  onFetchOpenApiSpec: () => Promise<boolean>;
  onOpenApiSpecTextChange: (value: string) => void;
  onParseOpenApiSpec: () => void;
  onToggleImportCreateRest: (checked: boolean) => void;
  onToggleImportCreateRoutes: (checked: boolean) => void;
  onToggleSelectAllOperations: (checked: boolean) => void;
  onToggleOperation: (operationId: string, method: RestVerb, path: string, checked: boolean) => void;
  onUploadOpenApiClick: () => void;
  onUploadOpenApiFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onApicurioSearchChange: (value: string) => void;
  onFetchApicurioArtifacts: () => void;
  onSelectApicurioArtifact: (artifactId: string) => void;
  onWizardNext: () => Promise<boolean>;
  onImportOpenApi: () => boolean;
  onGoToDesigner: () => void;
};

type RestDslImportWizardContentProps = Omit<RestDslImportWizardProps, 'isOpen'>;

export const RestDslImportWizardContent: FunctionComponent<RestDslImportWizardContentProps> = ({
  apicurioRegistryUrl,
  importSource,
  openApiSpecUri,
  openApiSpecText,
  openApiError,
  apicurioError,
  apicurioSearch,
  filteredApicurioArtifacts,
  selectedApicurioId,
  isApicurioLoading,
  isImportBusy,
  isOpenApiParsed,
  importCreateRest,
  importCreateRoutes,
  importSelectAll,
  importOperations,
  importStatus,
  openApiLoadSource,
  openApiFileInputRef,
  onClose,
  onImportSourceChange,
  onOpenApiSpecUriChange,
  onFetchOpenApiSpec,
  onOpenApiSpecTextChange,
  onParseOpenApiSpec,
  onToggleImportCreateRest,
  onToggleImportCreateRoutes,
  onToggleSelectAllOperations,
  onToggleOperation,
  onUploadOpenApiClick,
  onUploadOpenApiFile,
  onApicurioSearchChange,
  onFetchApicurioArtifacts,
  onSelectApicurioArtifact,
  onWizardNext,
  onImportOpenApi,
  onGoToDesigner,
}) => (
  <Wizard
    onClose={onClose}
    className="rest-dsl-page-import-wizard"
    footer={(activeStep, goToNextStep, goToPrevStep, close) =>
      renderImportWizardFooter(
        { activeStep, goToNextStep, goToPrevStep, close },
        {
          isImportBusy,
          isOpenApiParsed,
          importCreateRest,
          importCreateRoutes,
          onFinish: onImportOpenApi,
          onClose,
          onGoToDesigner: (_event) => onGoToDesigner(),
          onNext: async (_event) => onWizardNext(),
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
            isChecked={importSource === 'file'}
            onChange={() => onImportSourceChange('file')}
          />
          {importSource === 'file' && (
            <div className="rest-dsl-page-import-source">
              <Button variant="secondary" onClick={onUploadOpenApiClick}>
                Upload
              </Button>
              {isOpenApiParsed && openApiLoadSource === 'file' && (
                <span className="rest-dsl-page-import-success">
                  <CheckCircleIcon /> Loaded
                </span>
              )}
              <input
                ref={openApiFileInputRef}
                type="file"
                accept=".json,.yaml,.yml,application/json,application/yaml,application/x-yaml,text/yaml,text/x-yaml"
                onChange={onUploadOpenApiFile}
                className="rest-dsl-page-import-file-input"
              />
            </div>
          )}
          <Radio
            id="rest-openapi-import-uri"
            name="rest-openapi-import-source"
            label="Import from URI"
            isChecked={importSource === 'uri'}
            onChange={() => onImportSourceChange('uri')}
          />
          {importSource === 'uri' && (
            <div className="rest-dsl-page-import-source">
              <div className="rest-dsl-page-import-uri-row">
                <TextInput
                  id="rest-openapi-spec-uri"
                  value={openApiSpecUri}
                  onChange={(_event, value) => onOpenApiSpecUriChange(value)}
                />
                <Button
                  variant="secondary"
                  onClick={onFetchOpenApiSpec}
                  isDisabled={!openApiSpecUri.trim() || isImportBusy}
                >
                  Fetch
                </Button>
              </div>
              {isOpenApiParsed && openApiLoadSource === 'uri' && (
                <span className="rest-dsl-page-import-success rest-dsl-page-import-success-block">
                  <CheckCircleIcon /> Loaded
                </span>
              )}
            </div>
          )}
          <Radio
            id="rest-openapi-import-apicurio"
            name="rest-openapi-import-source"
            label="Import from Apicurio"
            isChecked={importSource === 'apicurio'}
            onChange={() => onImportSourceChange('apicurio')}
          />
          {importSource === 'apicurio' && (
            <div className="rest-dsl-page-import-source rest-dsl-page-import-apicurio">
              {apicurioRegistryUrl ? (
                <>
                  <div className="rest-dsl-page-import-apicurio-toolbar">
                    <SearchInput
                      aria-label="Search Apicurio artifacts"
                      placeholder="Search OpenAPI artifacts"
                      value={apicurioSearch}
                      onChange={(_event, value) => onApicurioSearchChange(value)}
                    />
                    <Button variant="secondary" onClick={onFetchApicurioArtifacts}>
                      Refresh
                    </Button>
                  </div>
                  {apicurioError && <span className="rest-dsl-page-import-error">{apicurioError}</span>}
                  <div className="rest-dsl-page-import-list-scroll rest-dsl-page-import-apicurio-list">
                    <List isPlain className="rest-dsl-page-list rest-dsl-page-list-nested">
                      {filteredApicurioArtifacts.map((artifact) => (
                        <ListItem key={artifact.id}>
                          <Radio
                            id={`rest-openapi-apicurio-${artifact.id}`}
                            name="rest-openapi-apicurio-artifact"
                            label={
                              <span>
                                {artifact.name || artifact.id}{' '}
                                <span className="rest-dsl-page-import-note">(id: {artifact.id})</span>
                              </span>
                            }
                            isChecked={selectedApicurioId === artifact.id}
                            onChange={() => onSelectApicurioArtifact(artifact.id)}
                          />
                        </ListItem>
                      ))}
                      {filteredApicurioArtifacts.length === 0 && !isApicurioLoading && (
                        <ListItem>No OpenAPI artifacts found.</ListItem>
                      )}
                    </List>
                  </div>
                  {isOpenApiParsed && openApiLoadSource === 'apicurio' && (
                    <span className="rest-dsl-page-import-success">
                      <CheckCircleIcon /> Loaded
                    </span>
                  )}
                </>
              ) : (
                <span className="rest-dsl-page-import-note">
                  Configure the Apicurio Registry URL in Settings to enable this option.
                </span>
              )}
            </div>
          )}
        </FormGroup>
        {openApiError && importSource !== 'apicurio' && (
          <span className="rest-dsl-page-import-error">{openApiError}</span>
        )}
      </Form>
    </WizardStep>
    <WizardStep name="Operations" id="operations">
      <Form>
        <FormGroup label="OpenAPI Specification" fieldId="rest-openapi-spec">
          <TextArea
            id="rest-openapi-spec"
            value={openApiSpecText}
            onChange={(_event, value) => onOpenApiSpecTextChange(value)}
            resizeOrientation="vertical"
            rows={6}
          />
        </FormGroup>
        <div className="rest-dsl-page-import-actions">
          <Button variant="secondary" onClick={onParseOpenApiSpec}>
            Parse Specification
          </Button>
          {openApiError && <span className="rest-dsl-page-import-error">{openApiError}</span>}
        </div>
        <div className="rest-dsl-page-import-options">
          <Checkbox
            id="rest-openapi-create-rest"
            label="Create Rest DSL operations"
            isChecked={importCreateRest}
            onChange={(_event, checked) => onToggleImportCreateRest(checked)}
          />
          <Checkbox
            id="rest-openapi-create-routes"
            label="Create routes with direct endpoints"
            isChecked={importCreateRoutes}
            onChange={(_event, checked) => onToggleImportCreateRoutes(checked)}
          />
        </div>
        {importOperations.length > 0 && (
          <div className="rest-dsl-page-import-list">
            <Checkbox
              id="rest-openapi-select-all"
              label="Select all operations"
              isChecked={importSelectAll}
              onChange={(_event, checked) => onToggleSelectAllOperations(checked)}
            />
            <div className="rest-dsl-page-import-list-scroll">
              <List isPlain className="rest-dsl-page-list rest-dsl-page-list-nested">
                {importOperations.map((operation) => (
                  <ListItem key={`${operation.operationId}-${operation.method}-${operation.path}`}>
                    <div className="rest-dsl-page-import-row">
                      <Checkbox
                        id={`rest-openapi-${operation.operationId}-${operation.method}`}
                        label={`${operation.method.toUpperCase()} ${operation.path}${
                          operation.routeExists ? ' - Route exists' : ''
                        }`}
                        isChecked={operation.routeExists ? false : operation.selected}
                        isDisabled={operation.routeExists}
                        onChange={(_event, checked) =>
                          onToggleOperation(operation.operationId, operation.method, operation.path, checked)
                        }
                      />
                    </div>
                  </ListItem>
                ))}
              </List>
            </div>
          </div>
        )}
      </Form>
    </WizardStep>
    <WizardStep name="Result" id="result">
      <Alert
        variant={importStatus?.type === 'success' ? 'success' : 'danger'}
        title={importStatus?.message ?? 'No import results yet.'}
        isInline
      />
    </WizardStep>
  </Wizard>
);

export const RestDslImportWizard: FunctionComponent<RestDslImportWizardProps> = ({ isOpen, onClose, ...props }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen
      variant={ModalVariant.large}
      aria-label="Import OpenAPI"
      onClose={onClose}
      className="rest-dsl-page-import-modal"
    >
      <ModalHeader title="Import OpenAPI" />
      <ModalBody>
        <RestDslImportWizardContent onClose={onClose} {...props} />
      </ModalBody>
    </Modal>
  );
};
