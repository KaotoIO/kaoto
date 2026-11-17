import { Checkbox, CheckboxGroup, InlineNotification } from '@carbon/react';
import { FunctionComponent } from 'react';

import { RestDslImportWizardState } from '../../../hooks/useRestDslImportWizard';
import { ImportOperation } from '../RestDslImportTypes';

type ImportOperationsStepProps = {
  wizard: RestDslImportWizardState;
};

const getOperationKey = (operation: ImportOperation) =>
  `${operation.operationId}-${operation.method}-${operation.path}`;

export const ImportOperationsStep: FunctionComponent<ImportOperationsStepProps> = ({ wizard }) => {
  const selectableOperations = wizard.importOperations.filter((operation) => !operation.routeExists);
  const selectedCount = selectableOperations.filter((operation) => operation.selected).length;
  const allSelected = selectableOperations.length > 0 && selectedCount === selectableOperations.length;
  const importError =
    wizard.isOpenApiParsed && wizard.importStatus?.type === 'error' ? wizard.importStatus.message : undefined;

  return (
    <div className="rest-dsl-import-operations">
      {importError && <InlineNotification kind="error" lowContrast hideCloseButton role="alert" title={importError} />}
      <CheckboxGroup legendText="Import options">
        <Checkbox
          id="rest-openapi-create-rest"
          labelText="Create Rest DSL operations"
          checked={wizard.importCreateRest}
          onChange={(_event, { checked }) => {
            wizard.setImportCreateRest(checked);
          }}
        />
        <Checkbox
          id="rest-openapi-create-routes"
          labelText="Create routes with direct endpoints"
          checked={wizard.importCreateRoutes}
          onChange={(_event, { checked }) => {
            wizard.setImportCreateRoutes(checked);
          }}
        />
      </CheckboxGroup>
      {wizard.importOperations.length > 0 && (
        <div className="rest-dsl-import-list">
          <Checkbox
            id="rest-openapi-select-all"
            labelText="Select all operations"
            checked={allSelected}
            disabled={selectableOperations.length === 0}
            indeterminate={selectedCount > 0 && !allSelected}
            onChange={(_event, { checked }) => {
              wizard.handleToggleSelectAllOperations(checked);
            }}
          />
          <section className="rest-dsl-import-list-scroll" aria-label="REST operations">
            {wizard.importOperations.map((operation) => (
              <Checkbox
                key={getOperationKey(operation)}
                id={`rest-openapi-${getOperationKey(operation)}`}
                labelText={`${operation.method.toUpperCase()} ${operation.path}${operation.routeExists ? ' - Route exists' : ''}`}
                checked={operation.routeExists ? false : operation.selected}
                disabled={operation.routeExists}
                onChange={(_event, { checked }) => {
                  wizard.handleToggleOperation(operation.operationId, operation.method, operation.path, checked);
                }}
              />
            ))}
          </section>
        </div>
      )}
    </div>
  );
};
