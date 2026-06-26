import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant } from '@patternfly/react-core';
import { FunctionComponent, ReactNode, useCallback } from 'react';

import { useToggle } from '../../../hooks/useToggle';

export type ConfirmActionButtonProps = {
  /** Icon displayed in the trigger button */
  icon: ReactNode;
  /** Trigger button title / aria-label */
  title: string;
  /** data-testid for the trigger button */
  triggerTestId: string;
  /** data-testid for the modal container */
  modalTestId: string;
  /** data-testid for the confirm button inside the modal */
  confirmTestId: string;
  /** data-testid for the cancel button inside the modal */
  cancelTestId: string;
  /** Modal header title */
  modalTitle: string;
  /** Modal body content — string or JSX */
  description: ReactNode;
  /** Optional icon variant for the modal header (e.g. 'warning') */
  titleIconVariant?: 'success' | 'danger' | 'warning' | 'info' | 'custom';
  onConfirm: () => void;
};

/**
 * Generic trigger-button + confirmation-modal composite.
 * Owns only the toggle state and the modal structure — no domain logic.
 * Callers supply the icon, all testids, and the onConfirm callback.
 */
export const ConfirmActionButton: FunctionComponent<ConfirmActionButtonProps> = ({
  icon,
  title,
  triggerTestId,
  modalTestId,
  confirmTestId,
  cancelTestId,
  modalTitle,
  description,
  titleIconVariant,
  onConfirm,
}) => {
  const { state: isModalOpen, toggleOn: openModal, toggleOff: closeModal } = useToggle(false);

  const handleConfirm = useCallback(() => {
    onConfirm();
    closeModal();
  }, [onConfirm, closeModal]);

  return (
    <>
      <Button
        icon={icon}
        variant="plain"
        title={title}
        aria-label={title}
        data-testid={triggerTestId}
        onClick={openModal}
      />

      <Modal variant={ModalVariant.small} isOpen={isModalOpen} data-testid={modalTestId} onClose={closeModal}>
        <ModalHeader title={modalTitle} titleIconVariant={titleIconVariant} />
        <ModalBody>{description}</ModalBody>
        <ModalFooter>
          <Button key="confirm" variant="primary" data-testid={confirmTestId} onClick={handleConfirm}>
            Confirm
          </Button>
          <Button key="cancel" variant="link" data-testid={cancelTestId} onClick={closeModal}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
