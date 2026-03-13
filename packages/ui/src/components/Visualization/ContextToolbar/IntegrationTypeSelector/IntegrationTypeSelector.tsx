import { isDefined } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useState } from 'react';

import { useRuntimeContext } from '../../../../hooks/useRuntimeContext/useRuntimeContext';
import { SourceSchemaType } from '../../../../models/camel';
import { FlowTemplateService } from '../../../../models/visualization/flows/support/flow-templates-service';
import { SourceCodeApiContext } from '../../../../providers';
import { findCatalog } from '../../../../utils/catalog-helper';
import { ChangeIntegrationTypeModal } from './ChangeIntegrationTypeModal/ChangeIntegrationTypeModal';
import { IntegrationTypeSelectorToggle } from './IntegrationTypeSelectorToggle/IntegrationTypeSelectorToggle';

export const IntegrationTypeSelector: FunctionComponent<PropsWithChildren> = () => {
  const runtimeContext = useRuntimeContext();
  const sourceCodeContextApi = useContext(SourceCodeApiContext);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [proposedFlowType, setProposedFlowType] = useState<SourceSchemaType>();
  const [changeCatalog, setChangeCatalog] = useState<boolean>();

  const checkBeforeAddNewFlow = useCallback((flowType: SourceSchemaType, changeCatalog: boolean) => {
    /**
     * If it is not the same integration type, this operation might result in
     * removing the existing flows, so then we warn the user first
     */
    setProposedFlowType(flowType);
    setChangeCatalog(changeCatalog);
    setIsConfirmationModalOpen(true);
  }, []);

  const onConfirm = useCallback(() => {
    if (proposedFlowType) {
      sourceCodeContextApi.setCodeAndNotify(FlowTemplateService.getFlowYamlTemplate(proposedFlowType));

      if (changeCatalog) {
        const matchingCatalog = findCatalog(proposedFlowType, runtimeContext.catalogLibrary);
        if (isDefined(matchingCatalog)) {
          runtimeContext.setSelectedCatalog(matchingCatalog);
        }
      }

      setIsConfirmationModalOpen(false);
    }
  }, [proposedFlowType, runtimeContext, sourceCodeContextApi, changeCatalog]);

  const onCancel = useCallback(() => {
    setIsConfirmationModalOpen(false);
  }, []);

  return (
    <>
      <IntegrationTypeSelectorToggle onSelect={checkBeforeAddNewFlow} />
      <ChangeIntegrationTypeModal
        isOpen={isConfirmationModalOpen}
        changesCatalog={changeCatalog}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </>
  );
};
