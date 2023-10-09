import { FlowTypeSelector } from './FlowTypeSelector';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, PropsWithChildren, useCallback, useContext, useState } from 'react';
import { Button, Modal } from '@patternfly/react-core';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';

export const NewFlow: FunctionComponent<PropsWithChildren> = () => {
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const { currentSchemaType } = useContext(EntitiesContext)!;

  const checkBeforeAddNewFlow = useCallback(
    (dsl: SourceSchemaType) => {
      console.log('selected new flow', dsl);
      const isSameSourceType = currentSchemaType === dsl;

      if (isSameSourceType) {
        /**
         * If it's the same DSL as we have in the existing Flows list,
         * we don't need to do anything special, just add a new flow if
         * supported
         */
        //setSettings({ dsl, namespace });
        console.log('Add new flow');
      } else {
        /**
         * If it is not the same DSL, this operation might result in
         * removing the existing flows, so then we warn the user first
         */
        //setProposedNewDsl(dsl);
        console.log('Creating new', sourceSchemaConfig.config[dsl].name);
        setIsConfirmationModalOpen(true);
      }
    },
    [],
    // [addNewFlow]
    // },[]
  );

  return (
    <>
      <FlowTypeSelector isStatic onSelect={checkBeforeAddNewFlow}>
        <PlusIcon />
        <span className="pf-u-m-sm-on-lg">New route</span>
      </FlowTypeSelector>
      <Modal
        title="Warning"
        titleIconVariant="warning"
        variant={'small'}
        actions={[
          <Button
            key="confirm"
            variant="primary"
            data-testid="confirmation-modal-confirm"
            onClick={() => {
              // deleteAllFlows();
              //
              // setSettings({ dsl: proposedDsl, namespace });
              //
              // addNewFlow(proposedDsl!.name);
              setIsConfirmationModalOpen(false);
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
