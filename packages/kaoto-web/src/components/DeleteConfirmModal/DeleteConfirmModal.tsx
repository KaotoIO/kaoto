import { Button, InlineNotification, Stack } from '@carbon/react';
import { FunctionComponent, ReactNode, useState } from 'react';

import { KaotoModal } from '../KaotoModal/KaotoModal';

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
    <KaotoModal
      title={heading}
      onClose={onClose}
      // A started deletion cannot be cancelled: the modal stays open until it is done
      preventClose={deleting}
      danger
      size="sm"
      preventCloseOnClickOutside
      className="cs--delete-confirm-modal"
      data-testid="delete-confirm-modal"
      footer={
        <>
          <Button kind="secondary" disabled={deleting} onClick={onClose} data-modal-primary-focus>
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
        </>
      }
    >
      <Stack gap={5}>
        <p>{children} This action cannot be undone.</p>
        {failure && (
          <InlineNotification kind="error" lowContrast hideCloseButton title="Could not delete" subtitle={failure} />
        )}
      </Stack>
    </KaotoModal>
  );
};
