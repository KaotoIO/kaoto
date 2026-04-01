import {
  Button,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextArea,
} from '@patternfly/react-core';
import { FormEvent, FunctionComponent, MouseEvent, useCallback, useEffect, useState } from 'react';

import { MappingItem } from '../../../../models/datamapper/mapping';

interface CommentModalProps {
  /** Controls whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Mapping item to edit comment for */
  mapping: MappingItem;
  /** Callback when mapping is updated */
  onUpdate: () => void;
  /** Whether to show Delete button for existing comments (default: true) */
  showDeleteButton?: boolean;
  /** Whether to wrap TextArea in FormGroup (default: false) */
  withFormGroup?: boolean;
}

export const CommentModal: FunctionComponent<CommentModalProps> = ({
  isOpen,
  onClose,
  mapping,
  onUpdate,
  showDeleteButton = true,
  withFormGroup = false,
}) => {
  const [commentText, setCommentText] = useState('');

  // Update commentText when modal opens or mapping changes
  useEffect(() => {
    if (isOpen) {
      setCommentText(mapping.comment || '');
    }
  }, [isOpen, mapping.comment]);

  const handleCommentChange = useCallback((_event: FormEvent, value: string) => {
    setCommentText(value);
  }, []);

  const handleClose = useCallback(() => {
    setCommentText('');
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    mapping.comment = commentText.trim() || undefined;
    onUpdate();
    handleClose();
  }, [commentText, mapping, onUpdate, handleClose]);

  const handleDelete = useCallback(() => {
    mapping.comment = undefined;
    onUpdate();
    handleClose();
  }, [mapping, onUpdate, handleClose]);

  const stopPropagation = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDownCapture = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // Stop propagation for any click on backdrop or modal content
      if (target.closest('.pf-v6-c-backdrop') || target.closest('.pf-v6-c-modal-box')) {
        e.stopPropagation();
      }
    };

    // Capture phase (third parameter = true) runs before React synthetic events
    document.addEventListener('mousedown', handleMouseDownCapture, true);
    document.addEventListener('pointerdown', handleMouseDownCapture, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDownCapture, true);
      document.removeEventListener('pointerdown', handleMouseDownCapture, true);
    };
  }, [isOpen]);

  const textAreaElement = (
    <TextArea
      data-testid="comment-textarea"
      id="comment-textarea"
      value={commentText}
      onChange={handleCommentChange}
      placeholder="Enter your comment here..."
      rows={5}
      autoFocus
    />
  );

  const isEditingExistingComment = Boolean(mapping.comment?.trim());

  const renderFooterButtons = () => {
    if (isEditingExistingComment && showDeleteButton) {
      return (
        <>
          <Button key="update" variant="primary" onClick={handleConfirm} data-testid="update-comment-btn">
            Update
          </Button>
          <Button key="delete" variant="danger" onClick={handleDelete} data-testid="delete-comment-btn">
            Delete
          </Button>
          <Button key="cancel" variant="link" onClick={handleClose} data-testid="cancel-comment-btn">
            Cancel
          </Button>
        </>
      );
    }

    if (isEditingExistingComment) {
      return (
        <>
          <Button key="confirm" variant="primary" onClick={handleConfirm} data-testid="comment-confirm-btn">
            Confirm
          </Button>
          <Button key="cancel" variant="link" onClick={handleClose} data-testid="comment-cancel-btn">
            Cancel
          </Button>
        </>
      );
    }

    return (
      <>
        <Button key="create" variant="primary" onClick={handleConfirm} data-testid="create-comment-btn">
          Create
        </Button>
        <Button key="cancel" variant="link" onClick={handleClose} data-testid="cancel-comment-btn">
          Cancel
        </Button>
      </>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      variant={ModalVariant.small}
      onClose={handleClose}
      data-testid="comment-modal"
      aria-label="Comment Editor Modal"
    >
      <ModalHeader title={isEditingExistingComment ? 'Edit Comment' : 'Add Comment'} />
      <ModalBody onClick={stopPropagation}>
        {withFormGroup ? (
          <FormGroup label="Comment" fieldId="comment-textarea">
            {textAreaElement}
          </FormGroup>
        ) : (
          textAreaElement
        )}
      </ModalBody>
      <ModalFooter>{renderFooterButtons()}</ModalFooter>
    </Modal>
  );
};
