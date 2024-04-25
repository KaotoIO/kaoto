import { FunctionComponent, PropsWithChildren, useCallback, useContext, useState } from 'react';
import { SourceSchemaType } from '../../../../models/camel';
import { FlowTemplateService } from '../../../../models/visualization/flows/support/flow-templates-service';
import { SourceCodeApiContext } from '../../../../providers';
import { ChangeDSLModal } from './ChangeDSLModal/ChangeDSLModal';
import { DSLSelectorToggle } from './DSLSelectorToggle/DSLSelectorToggle';

export const DSLSelector: FunctionComponent<PropsWithChildren> = () => {
  const sourceCodeContextApi = useContext(SourceCodeApiContext);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [proposedFlowType, setProposedFlowType] = useState<SourceSchemaType>();

  const checkBeforeAddNewFlow = useCallback((flowType: SourceSchemaType) => {
    /**
     * If it is not the same DSL, this operation might result in
     * removing the existing flows, so then we warn the user first
     */
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
      <DSLSelectorToggle onSelect={checkBeforeAddNewFlow} />
      <ChangeDSLModal isOpen={isConfirmationModalOpen} onConfirm={onConfirm} onCancel={onCancel} />
    </>
  );
};
