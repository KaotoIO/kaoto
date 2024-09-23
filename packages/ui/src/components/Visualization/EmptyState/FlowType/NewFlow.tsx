import { Button, Modal, ModalVariant } from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useState } from 'react';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';
import { SourceSchemaType } from '../../../../models/camel';
import { FlowTemplateService } from '../../../../models/visualization/flows/support/flow-templates-service';
import { SourceCodeApiContext } from '../../../../providers';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';
import { FlowTypeSelector } from './FlowTypeSelector';

export const NewFlow: FunctionComponent<PropsWithChildren> = () => {
  const sourceCodeContextApi = useContext(SourceCodeApiContext);
  const entitiesContext = useEntityContext();
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [proposedFlowType, setProposedFlowType] = useState<SourceSchemaType>();

  const checkBeforeAddNewFlow = useCallback(
    (flowType: SourceSchemaType) => {
      const isSameSourceType = entitiesContext.currentSchemaType === flowType;

      if (isSameSourceType) {
        /**
         * If it's the same DSL as we have in the existing Flows list,
         * we don't need to do anything special, just add a new flow if
         * supported
         */
        const newId = entitiesContext.camelResource.addNewEntity();
        visibleFlowsContext.visualFlowsApi.hideAllFlows();
        visibleFlowsContext.visualFlowsApi.toggleFlowVisible(newId);
        entitiesContext.updateEntitiesFromCamelResource();
      } else {
        /**
         * If it is not the same DSL, this operation might result in
         * removing the existing flows, so then we warn the user first
         */
        setProposedFlowType(flowType);
        setIsConfirmationModalOpen(true);
      }
    },
    [entitiesContext, visibleFlowsContext.visualFlowsApi],
  );

  return (
    <>
      <FlowTypeSelector isStatic onSelect={checkBeforeAddNewFlow}>
        <PlusIcon />
        <span className="pf-v5-u-m-sm">New</span>
      </FlowTypeSelector>
      <Modal
        variant={ModalVariant.small}
        title="Warning"
        data-testid="confirmation-modal"
        titleIconVariant="warning"
        onClose={() => {
          setIsConfirmationModalOpen(false);
        }}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            data-testid="confirmation-modal-confirm"
            onClick={() => {
              if (proposedFlowType) {
                sourceCodeContextApi.setCodeAndNotify(FlowTemplateService.getFlowYamlTemplate(proposedFlowType));
                setIsConfirmationModalOpen(false);
              }
            }}
          >
            Confirm
          </Button>,
          <Button
            key="cancel"
            variant="link"
            data-testid="confirmation-modal-cancel"
            onClick={() => {
              setIsConfirmationModalOpen(false);
            }}
          >
            Cancel
          </Button>,
        ]}
        isOpen={isConfirmationModalOpen}
      >
        <p>
          This will remove any existing integration and you will lose your current work. Are you sure you would like to
          proceed?
        </p>
      </Modal>
    </>
  );
};
