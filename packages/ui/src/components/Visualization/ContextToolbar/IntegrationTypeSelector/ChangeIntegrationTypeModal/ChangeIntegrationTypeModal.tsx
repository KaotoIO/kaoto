import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

interface ChangeIntegrationTypeModalProps {
  isOpen: boolean;
  changesCatalog?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ChangeIntegrationTypeModal: FunctionComponent<ChangeIntegrationTypeModalProps> = (props) => {
  return (
    <Modal variant={ModalVariant.small} data-testid="confirmation-modal" onClose={props.onCancel} isOpen={props.isOpen}>
      <ModalHeader title="Warning" titleIconVariant="warning" />
      <ModalBody>
        <p data-testid={'confirmation-modal-text'}>
          Changing the source type will remove any existing integration and you will lose your current work.{' '}
          {props.changesCatalog && 'This will also change the current selected catalog.'}
        </p>
        <p>Are you sure you would like to proceed?</p>
      </ModalBody>
      <ModalFooter>
        <Button key="confirm" variant="primary" data-testid="confirmation-modal-confirm" onClick={props.onConfirm}>
          Confirm
        </Button>
        <Button key="cancel" variant="link" data-testid="confirmation-modal-cancel" onClick={props.onCancel}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
