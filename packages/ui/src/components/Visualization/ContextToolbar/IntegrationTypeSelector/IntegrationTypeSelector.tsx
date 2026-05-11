import { FunctionComponent, PropsWithChildren, useCallback, useContext, useState } from 'react';

import { SourceSchemaType } from '../../../../models/camel';
import { FlowTemplateService } from '../../../../models/visualization/flows/support/flow-templates-service';
import { SourceCodeApiContext } from '../../../../providers';
import { ChangeIntegrationTypeModal } from './ChangeIntegrationTypeModal/ChangeIntegrationTypeModal';
import { IntegrationTypeSelectorToggle } from './IntegrationTypeSelectorToggle/IntegrationTypeSelectorToggle';

export const IntegrationTypeSelector: FunctionComponent<PropsWithChildren> = () => {
  const sourceCodeContextApi = useContext(SourceCodeApiContext);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [proposedFlowType, setProposedFlowType] = useState<SourceSchemaType>();

  const checkBeforeAddNewFlow = useCallback((flowType: SourceSchemaType) => {
    setProposedFlowType(flowType);
    setIsConfirmationModalOpen(true);
  }, []);

  const onConfirm = useCallback(() => {
    if (proposedFlowType) {
      sourceCodeContextApi.setCodeAndNotify(FlowTemplateService.getFlowYamlTemplate(proposedFlowType));
      setIsConfirmationModalOpen(false);
    }
  }, [proposedFlowType, sourceCodeContextApi]);

  const onCancel = useCallback(() => {
    setIsConfirmationModalOpen(false);
  }, []);

  return (
    <>
      <IntegrationTypeSelectorToggle onSelect={checkBeforeAddNewFlow} />
      <ChangeIntegrationTypeModal isOpen={isConfirmationModalOpen} onConfirm={onConfirm} onCancel={onCancel} />
    </>
  );
};
