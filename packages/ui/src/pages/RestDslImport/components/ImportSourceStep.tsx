import { InlineNotification, RadioButton, RadioButtonGroup } from '@carbon/react';
import { FunctionComponent } from 'react';

import { RestDslImportWizardState } from '../../../hooks/useRestDslImportWizard';
import { ImportSourceOption } from '../RestDslImportTypes';
import { ApicurioImportSource } from './ApicurioImportSource';
import { FileImportSource } from './FileImportSource';
import { UriImportSource } from './UriImportSource';

type ImportSourceStepProps = {
  wizard: RestDslImportWizardState;
  onOpenSettings: () => void;
};

const SOURCE_OPTIONS: ReadonlyArray<{ value: ImportSourceOption; label: string }> = [
  { value: 'file', label: 'Upload file' },
  { value: 'uri', label: 'Import from URI' },
  { value: 'apicurio', label: 'Import from Apicurio' },
];

export const ImportSourceStep: FunctionComponent<ImportSourceStepProps> = ({ wizard, onOpenSettings }) => (
  <div>
    <RadioButtonGroup
      legendText="Choose import source"
      name="rest-openapi-import-source"
      orientation="horizontal"
      valueSelected={wizard.importSource}
      onChange={(value) => {
        wizard.handleImportSourceChange(value as ImportSourceOption);
      }}
    >
      {SOURCE_OPTIONS.map(({ value, label }) => (
        <RadioButton key={value} id={`rest-openapi-import-${value}`} labelText={label} value={value} />
      ))}
    </RadioButtonGroup>
    <div className="rest-dsl-import-source">
      {wizard.openApiLoadSource === 'manual' && (
        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Specification edited manually"
          subtitle="Load a new specification to replace it."
        />
      )}
      {wizard.importSource === 'file' && (
        <FileImportSource
          onSchemaLoaded={wizard.handleSchemaLoaded}
          onCleared={wizard.handleSourceCleared}
          loadedFilename={wizard.openApiLoadSource === 'file' ? wizard.sourceIdentifier : ''}
        />
      )}
      {wizard.importSource === 'uri' && (
        <UriImportSource
          onSchemaLoaded={wizard.handleSchemaLoaded}
          onCleared={wizard.handleSourceCleared}
          initialUri={wizard.importUri}
          onUriChange={wizard.setImportUri}
          loaded={wizard.openApiLoadSource === 'uri'}
        />
      )}
      {wizard.importSource === 'apicurio' && (
        <ApicurioImportSource
          registryUrl={wizard.apicurioRegistryUrl}
          onSchemaLoaded={wizard.handleSchemaLoaded}
          onCleared={wizard.handleSourceCleared}
          onOpenSettings={onOpenSettings}
          loadedSourceIdentifier={wizard.openApiLoadSource === 'apicurio' ? wizard.sourceIdentifier : ''}
        />
      )}
    </div>
  </div>
);
