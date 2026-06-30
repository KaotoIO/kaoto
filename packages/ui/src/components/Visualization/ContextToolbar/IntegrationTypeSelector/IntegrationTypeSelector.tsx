import { FunctionComponent, PropsWithChildren, useCallback, useState } from 'react';

import { SourceSchemaType } from '../../../../models/camel';
import { ConfirmIntegrationTypeChangeModal } from '../../ConfirmIntegrationTypeChangeModal/ConfirmIntegrationTypeChangeModal';
import { IntegrationTypeSelectorToggle } from './IntegrationTypeSelectorToggle/IntegrationTypeSelectorToggle';

export const IntegrationTypeSelector: FunctionComponent<PropsWithChildren> = () => {
  const [proposedFlowType, setProposedFlowType] = useState<SourceSchemaType>();

  const checkBeforeAddNewFlow = useCallback((flowType: SourceSchemaType) => {
    /**
     * If it is not the same integration type, this operation might result in
     * removing the existing flows, so then we warn the user first
     */
    setProposedFlowType(flowType);
  }, []);

  return (
    <>
      <IntegrationTypeSelectorToggle onSelect={checkBeforeAddNewFlow} />
      <ConfirmIntegrationTypeChangeModal
        proposedFlowType={proposedFlowType}
        onClose={() => {
          setProposedFlowType(undefined);
        }}
      />
    </>
  );
};
