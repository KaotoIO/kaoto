import { Button, ComposedModal, InlineNotification, ModalBody, ModalFooter, ModalHeader, Stack } from '@carbon/react';
import { FunctionComponent, ReactNode, useState } from 'react';

interface DeleteConfirmModalProps {
  /** E.g. "Delete file?" */
  heading: string;
  /** What is deleted, e.g. "Are you sure you want to delete <strong>a.yaml</strong>?" */
  children: ReactNode;
  /** Deletes; when it rejects, the modal shows the error and stays open */
  onDelete: () => Promise<void>;
  onClose: () => void;
}

/**
 * Asks for confirmation before deleting files.
 *
 * Cancel has the initial focus, so that Enter does not delete by accident. Render it only while it is open.
 */
export const DeleteConfirmModal: FunctionComponent<DeleteConfirmModalProps> = ({
  heading,
  children,
  onDelete,
  onClose,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [failure, setFailure] = useState<string>();

  const handleDelete = async () => {
    setDeleting(true);
    setFailure(undefined);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      setDeleting(false);
    }
  };

  return (
    <ComposedModal
      open
      danger
      size="sm"
      onClose={() => {
        onClose();
        return true;
      }}
      preventCloseOnClickOutside
      className="cs--delete-confirm-modal"
      data-testid="delete-confirm-modal"
    >
      <ModalHeader title={heading} />
      <ModalBody>
        <Stack gap={5}>
          <p>{children} This action cannot be undone.</p>
          {failure && (
            <InlineNotification kind="error" lowContrast hideCloseButton title="Could not delete" subtitle={failure} />
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" onClick={onClose} data-modal-primary-focus>
          Cancel
        </Button>
        <Button
          kind="danger"
          disabled={deleting}
          onClick={() => {
            void handleDelete();
          }}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};
