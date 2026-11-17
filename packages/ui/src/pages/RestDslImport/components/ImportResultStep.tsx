import { InlineNotification } from '@carbon/react';
import { FunctionComponent } from 'react';

import { RestDslImportWizardState } from '../../../hooks/useRestDslImportWizard';
import { ImportedOutputs } from '../RestDslImportTypes';

type ImportResultStepProps = {
  status: RestDslImportWizardState['importStatus'];
  failed: boolean;
  /** What the completed import generated, so the next steps match it */
  outputs?: ImportedOutputs | null;
};

export const ImportResultStep: FunctionComponent<ImportResultStepProps> = ({ status, failed, outputs }) => {
  if (failed) {
    return (
      <div className="rest-dsl-import-result">
        <InlineNotification
          kind="error"
          lowContrast
          hideCloseButton
          role="alert"
          title="Import failed."
          subtitle="The selected operations could not be imported. Some of them may already have been added."
        />
        <h2 className="rest-dsl-import-result__heading">What you can do</h2>
        <ul className="rest-dsl-import-result__list">
          <li>Go to Rest Editor or Designer to check what was added before you import again.</li>
          <li>Go back to Operations to import the operations that were not added.</li>
          <li>If the problem continues, return to Specification and check the OpenAPI document.</li>
        </ul>
      </div>
    );
  }

  if (status?.type === 'success') {
    return (
      <div className="rest-dsl-import-result">
        <InlineNotification kind="success" lowContrast hideCloseButton title={status.message} />
        <h2 className="rest-dsl-import-result__heading">What you can do next</h2>
        <dl className="rest-dsl-import-result__next">
          {outputs?.rest && (
            <>
              <dt>Go to Rest Editor</dt>
              <dd>Review the imported REST operations and edit their details.</dd>
            </>
          )}
          {outputs?.routes && (
            <>
              <dt>Go to Designer</dt>
              <dd>Open the routes created for the imported operations and add the steps that process each request.</dd>
            </>
          )}
        </dl>
      </div>
    );
  }

  return <InlineNotification kind="info" lowContrast hideCloseButton title="No import results yet." />;
};
