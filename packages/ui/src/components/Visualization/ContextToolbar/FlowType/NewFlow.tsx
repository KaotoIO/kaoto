import { FlowTypeSelector } from './FlowTypeSelector';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useState } from 'react';
import { Button, Modal } from '@patternfly/react-core';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { SourceSchemaType } from '../../../../models/camel';
import { VisibleFlowsContext } from '../../../../providers/visible-flows.provider';

export const NewFlow: FunctionComponent<PropsWithChildren> = () => {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const entitiesContext = useContext(EntitiesContext)!;
  const visibleFlowsContext = useContext(VisibleFlowsContext)!;
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
        visibleFlowsContext.visualFlowsApi.setVisibleFlows([newId]);
        entitiesContext.updateCodeFromEntities();
      } else {
        /**
         * If it is not the same DSL, this operation might result in
         * removing the existing flows, so then we warn the user first
         */
        setProposedFlowType(flowType);
        setIsConfirmationModalOpen(true);
      }
    },
    [entitiesContext.currentSchemaType],
  );

  return (
    <>
      <FlowTypeSelector isStatic onSelect={checkBeforeAddNewFlow}>
        <PlusIcon />
        <span className="pf-u-m-sm-on-lg">New route</span>
      </FlowTypeSelector>
      <Modal
        title="Warning"
        data-testid="confirmation-modal"
        titleIconVariant="warning"
        variant={'small'}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            data-testid="confirmation-modal-confirm"
            onClick={() => {
              if (proposedFlowType) {
                entitiesContext.setCurrentSchemaType(proposedFlowType);
                entitiesContext.setCode(entitiesContext.flowTemplateService.getFlowYamlTemplate(proposedFlowType));
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
          This will remove the existing routes and you will lose your current work. Are you sure you would like to
          proceed?
        </p>
      </Modal>
    </>
  );
};
