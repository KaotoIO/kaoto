import { Button, InlineNotification, TextArea } from '@carbon/react';
import { FunctionComponent } from 'react';

import { RestDslImportWizardState } from '../../../hooks/useRestDslImportWizard';

type ImportSpecificationStepProps = {
  wizard: RestDslImportWizardState;
};

const PARSE_HINT =
  'Check that the content is a valid OpenAPI document in JSON or YAML, then select Parse Specification again.';

export const ImportSpecificationStep: FunctionComponent<ImportSpecificationStepProps> = ({ wizard }) => {
  const operationCount = wizard.importOperations.length;
  const parseError = !wizard.isOpenApiParsed ? wizard.parseError : null;

  return (
    <div className="rest-dsl-import-specification">
      <TextArea
        id="rest-openapi-spec"
        labelText="OpenAPI Specification"
        value={wizard.openApiSpecText}
        onChange={(event) => {
          wizard.setOpenApiSpecText(event.target.value);
        }}
        rows={6}
      />
      <div className="rest-dsl-import-actions">
        <Button
          kind="secondary"
          size="md"
          className="rest-dsl-import-inline-button"
          onClick={() => {
            wizard.handleParseOpenApiSpec();
          }}
        >
          Parse Specification
        </Button>
      </div>
      {wizard.isOpenApiParsed && (
        <InlineNotification
          kind="success"
          lowContrast
          hideCloseButton
          title="Specification parsed successfully."
          subtitle={`${operationCount} operation${operationCount === 1 ? '' : 's'} found.`}
        />
      )}
      {parseError && (
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title={parseError}
          subtitle={PARSE_HINT}
        />
      )}
    </div>
  );
};
