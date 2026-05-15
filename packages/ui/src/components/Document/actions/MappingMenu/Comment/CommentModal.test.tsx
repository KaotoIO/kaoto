import { act, fireEvent, render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../../models/datamapper/document';
import { MappingTree, ValueSelector } from '../../../../../models/datamapper/mapping';
import { CommentModal } from './CommentModal';

describe('CommentModal', () => {
  let tree: MappingTree;
  let mapping: ValueSelector;
  let onCloseMock: jest.Mock;
  let onUpdateMock: jest.Mock;

  beforeEach(() => {
    tree = new MappingTree(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    mapping = new ValueSelector(tree);
    onCloseMock = jest.fn();
    onUpdateMock = jest.fn();
  });

  describe('Modal Visibility', () => {
    it('should render modal when isOpen is true', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);
      expect(screen.getByTestId('comment-modal')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(<CommentModal isOpen={false} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);
      expect(screen.queryByTestId('comment-modal')).not.toBeInTheDocument();
    });
  });

  describe('Adding New Comment', () => {
    it('should display "Add Comment" title when mapping has no comment', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);
      expect(screen.getByText('Add Comment')).toBeInTheDocument();
    });

    it('should display Create button when adding new comment', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);
      expect(screen.getByTestId('create-comment-btn')).toBeInTheDocument();
    });

    it('should create comment and call onUpdate when Create is clicked', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      const textarea = screen.getByTestId('comment-textarea');
      act(() => {
        fireEvent.change(textarea, { target: { value: 'New comment' } });
      });

      const createBtn = screen.getByTestId('create-comment-btn');
      act(() => {
        fireEvent.click(createBtn);
      });

      expect(mapping.comment).toBe('New comment');
      expect(onUpdateMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Editing Existing Comment', () => {
    beforeEach(() => {
      mapping.comment = 'Existing comment';
    });

    it('should display "Edit Comment" title when mapping has a comment', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);
      expect(screen.getByText('Edit Comment')).toBeInTheDocument();
    });

    it('should populate textarea with existing comment', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);
      const textarea = screen.getByTestId('comment-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Existing comment');
    });

    it('should display Update and Delete buttons when editing with showDeleteButton=true', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);
      expect(screen.getByTestId('update-comment-btn')).toBeInTheDocument();
      expect(screen.getByTestId('delete-comment-btn')).toBeInTheDocument();
    });

    it('should update comment and call onUpdate when Update is clicked', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      const textarea = screen.getByTestId('comment-textarea');
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Updated comment' } });
      });

      const updateBtn = screen.getByTestId('update-comment-btn');
      act(() => {
        fireEvent.click(updateBtn);
      });

      expect(mapping.comment).toBe('Updated comment');
      expect(onUpdateMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('should delete comment and call onUpdate when Delete is clicked', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      const deleteBtn = screen.getByTestId('delete-comment-btn');
      act(() => {
        fireEvent.click(deleteBtn);
      });

      expect(mapping.comment).toBeUndefined();
      expect(onUpdateMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('showDeleteButton prop', () => {
    beforeEach(() => {
      mapping.comment = 'Existing comment';
    });

    it('should show Confirm button instead of Update/Delete when showDeleteButton=false', () => {
      render(
        <CommentModal
          isOpen={true}
          onClose={onCloseMock}
          mapping={mapping}
          onUpdate={onUpdateMock}
          showDeleteButton={false}
        />,
      );

      expect(screen.getByTestId('comment-confirm-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('update-comment-btn')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-comment-btn')).not.toBeInTheDocument();
    });

    it('should update comment when Confirm is clicked with showDeleteButton=false', () => {
      render(
        <CommentModal
          isOpen={true}
          onClose={onCloseMock}
          mapping={mapping}
          onUpdate={onUpdateMock}
          showDeleteButton={false}
        />,
      );

      const textarea = screen.getByTestId('comment-textarea');
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Confirmed comment' } });
      });

      const confirmBtn = screen.getByTestId('comment-confirm-btn');
      act(() => {
        fireEvent.click(confirmBtn);
      });

      expect(mapping.comment).toBe('Confirmed comment');
      expect(onUpdateMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onClose when Cancel is clicked', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      const cancelBtn = screen.getByTestId('cancel-comment-btn');
      act(() => {
        fireEvent.click(cancelBtn);
      });

      expect(onCloseMock).toHaveBeenCalledTimes(1);
      expect(onUpdateMock).not.toHaveBeenCalled();
    });

    it('should not update mapping when Cancel is clicked', () => {
      render(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      const textarea = screen.getByTestId('comment-textarea');
      act(() => {
        fireEvent.change(textarea, { target: { value: 'Changed text' } });
      });

      const cancelBtn = screen.getByTestId('cancel-comment-btn');
      act(() => {
        fireEvent.click(cancelBtn);
      });

      expect(mapping.comment).toBeUndefined();
    });
  });

  describe('Comment State Synchronization', () => {
    it('should update textarea when mapping.comment changes', () => {
      mapping.comment = 'Initial comment';
      const { rerender } = render(
        <CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />,
      );

      const textarea = screen.getByTestId('comment-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Initial comment');

      // Change mapping comment
      mapping.comment = 'Updated comment';
      rerender(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      expect(textarea.value).toBe('Updated comment');
    });

    it('should update textarea when modal reopens with different mapping', () => {
      const { rerender } = render(
        <CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />,
      );

      // Close modal
      rerender(<CommentModal isOpen={false} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      // Change mapping and reopen
      mapping.comment = 'New comment';
      rerender(<CommentModal isOpen={true} onClose={onCloseMock} mapping={mapping} onUpdate={onUpdateMock} />);

      const textarea = screen.getByTestId('comment-textarea') as HTMLTextAreaElement;
      expect(textarea.value).toBe('New comment');
    });
  });
});
