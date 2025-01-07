import { Button } from '@patternfly/react-core';
import { Modal, ModalVariant } from '@patternfly/react-core/deprecated';
import { FunctionComponent } from 'react';

interface ChangeDSLModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ChangeDSLModal: FunctionComponent<ChangeDSLModalProps> = (props) => {
  return (
    <Modal
      variant={ModalVariant.small}
      title="Warning"
      data-testid="confirmation-modal"
      titleIconVariant="warning"
      onClose={props.onCancel}
      actions={[
        <Button key="confirm" variant="primary" data-testid="confirmation-modal-confirm" onClick={props.onConfirm}>
          Confirm
        </Button>,
        <Button key="cancel" variant="link" data-testid="confirmation-modal-cancel" onClick={props.onCancel}>
          Cancel
        </Button>,
      ]}
      isOpen={props.isOpen}
    >
      <p>
        This will remove any existing integration and you will lose your current work. Are you sure you would like to
        proceed?
      </p>
    </Modal>
  );
};
