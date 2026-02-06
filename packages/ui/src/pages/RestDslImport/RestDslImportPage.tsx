import '../RestDsl/RestDslPage.scss';

import { Card, CardBody, CardHeader, Title } from '@patternfly/react-core';
import { FunctionComponent, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { Links } from '../../router/links.models';
import { RestDslImportWizardContent } from '../RestDsl/RestDslImportWizard';
import { useRestDslImportWizard } from '../RestDsl/useRestDslImportWizard';

export const RestDslImportPage: FunctionComponent = () => {
  const navigate = useNavigate();
  const wizard = useRestDslImportWizard({ isActive: true });

  const handleClose = useCallback(() => {
    wizard.resetImportWizard();
    navigate(Links.Rest);
  }, [navigate, wizard]);

  const handleGoToDesigner = useCallback(() => {
    wizard.resetImportWizard();
    navigate(Links.Home);
  }, [navigate, wizard]);

  return (
    <>
      <div className="rest-dsl-page">
        <Card className="rest-dsl-page-panel">
          <CardHeader className="rest-dsl-page-panel-header">
            <div className="rest-dsl-page-header">
              <Title headingLevel="h2" size="md" className="rest-dsl-page-panel-title">
                Import OpenAPI
              </Title>
            </div>
          </CardHeader>
          <CardBody className="rest-dsl-page-panel-body">
            <RestDslImportWizardContent
              apicurioRegistryUrl={wizard.apicurioRegistryUrl}
              importSource={wizard.importSource}
              openApiSpecUri={wizard.openApiSpecUri}
              openApiSpecText={wizard.openApiSpecText}
              openApiError={wizard.openApiError}
              apicurioError={wizard.apicurioError}
              apicurioSearch={wizard.apicurioSearch}
              filteredApicurioArtifacts={wizard.filteredApicurioArtifacts}
              selectedApicurioId={wizard.selectedApicurioId}
              isApicurioLoading={wizard.isApicurioLoading}
              isImportBusy={wizard.isImportBusy}
              isOpenApiParsed={wizard.isOpenApiParsed}
              importCreateRest={wizard.importCreateRest}
              importCreateRoutes={wizard.importCreateRoutes}
              importSelectAll={wizard.importSelectAll}
              importOperations={wizard.importOperations}
              importStatus={wizard.importStatus}
              openApiLoadSource={wizard.openApiLoadSource}
              openApiFileInputRef={wizard.openApiFileInputRef}
              onClose={handleClose}
              onImportSourceChange={wizard.handleImportSourceChange}
              onOpenApiSpecUriChange={wizard.setOpenApiSpecUri}
              onFetchOpenApiSpec={wizard.handleFetchOpenApiSpec}
              onOpenApiSpecTextChange={wizard.setOpenApiSpecText}
              onParseOpenApiSpec={wizard.handleParseOpenApiSpec}
              onToggleImportCreateRest={wizard.setImportCreateRest}
              onToggleImportCreateRoutes={wizard.setImportCreateRoutes}
              onToggleSelectAllOperations={wizard.handleToggleSelectAllOperations}
              onToggleOperation={wizard.handleToggleOperation}
              onUploadOpenApiClick={wizard.handleUploadOpenApiClick}
              onUploadOpenApiFile={wizard.handleUploadOpenApiFile}
              onApicurioSearchChange={wizard.setApicurioSearch}
              onFetchApicurioArtifacts={wizard.fetchApicurioArtifacts}
              onSelectApicurioArtifact={wizard.setSelectedApicurioId}
              onWizardNext={wizard.handleWizardNext}
              onImportOpenApi={wizard.handleImportOpenApi}
              onGoToDesigner={handleGoToDesigner}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
};
