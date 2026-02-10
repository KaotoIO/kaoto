import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalVariant, TextArea } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';

export type CommentsModalProps = {
  isOpen: boolean;
  initialComment?: string;
  onCreateComment: (comment: string) => void;
  onUpdateComment?: (comment: string) => void;
  onDeleteComment?: () => void;
  onCancel: () => void;
};

export const CommentsModal: FunctionComponent<CommentsModalProps> = ({
  isOpen,
  initialComment = '',
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
  onCancel,
}) => {
  const [comment, setComment] = useState<string>(initialComment);
  const isEditMode = Boolean(initialComment);

  const handleCreate = () => {
    onCreateComment(comment);
  };

  const handleUpdate = () => {
    if (onUpdateComment) {
      onUpdateComment(comment);
    }
  };

  const handleDelete = () => {
    if (onDeleteComment) {
      onDeleteComment();
    }
  };

  const handleCancel = () => {
    setComment(initialComment);
    onCancel();
  };

  return (
    <Modal
      isOpen={isOpen}
      variant={ModalVariant.small}
      data-testid="comments-modal"
      onClose={handleCancel}
      ouiaId="CommentsModal"
    >
      <ModalHeader title={isEditMode ? 'Edit Comment' : 'Add Comment'} />

      <ModalBody>
        <TextArea
          type="text"
          id="comment-area"
          name="comment-area"
          aria-label="Comment input area"
          value={comment}
          onChange={(_event, value) => setComment(value)}
          placeholder="Enter your comment..."
          data-testid="comment-area"
        />
      </ModalBody>

      <ModalFooter>
        {isEditMode ? (
          <>
            <Button key="update" variant="primary" onClick={handleUpdate} data-testid="update-comment-btn">
              Update
            </Button>
            <Button key="delete" variant="danger" onClick={handleDelete} data-testid="delete-comment-btn">
              Delete
            </Button>
            <Button key="cancel" variant="link" onClick={handleCancel} data-testid="cancel-comment-btn">
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button key="create" variant="primary" onClick={handleCreate} data-testid="create-comment-btn">
              Create
            </Button>
            <Button key="cancel" variant="link" onClick={handleCancel} data-testid="cancel-comment-btn">
              Cancel
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};
