import { Alert, Button, ModalBody, ModalFooter, ModalHeader, Stack, StackItem } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { DataMapperModal } from '../../../DataMapper/DataMapperModal';

type UpdateSchemaWarningModalProps = {
  actionName: string;
  documentTypeLabel: string;
  isModalOpen: boolean;
  onProceed: () => void;
  onCancel: () => void;
};

export const UpdateSchemaWarningModal: FunctionComponent<UpdateSchemaWarningModalProps> = ({
  actionName,
  documentTypeLabel,
  isModalOpen,
  onProceed,
  onCancel,
}) => {
  return (
    <DataMapperModal isOpen={isModalOpen} variant="small" data-testid="update-schema-warning-modal">
      <ModalHeader title={`${actionName} schema : ( ${documentTypeLabel} )`} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert variant="warning" title="Warning">
              {documentTypeLabel} already has a schema attached. Are you sure you want to replace it? Replacing it might
              result in a loss of any existing data mappings.
            </Alert>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="Update-Schema-Warning-Button"
          data-testid="update-schema-warning-modal-btn-continue"
          variant="primary"
          onClick={onProceed}
        >
          Continue
        </Button>
        <Button key="Cancel" data-testid="update-schema-warning-modal-btn-cancel" variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </DataMapperModal>
  );
};
