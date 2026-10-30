import { fireEvent, render, screen } from '@testing-library/react';

import { EditorModal } from './EditorModal';

describe('EditorModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof EditorModal>> = {}) => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <EditorModal open title="Add thing" testId="thing-modal" onClose={onClose} onSubmit={onSubmit} {...props}>
        <p>modal body</p>
      </EditorModal>,
    );
    return { onClose, onSubmit };
  };

  it('renders the title, the body and the default footer buttons', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add thing')).toBeInTheDocument();
    expect(screen.getByText('modal body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('derives test ids from the testId prop', () => {
    renderModal();

    expect(screen.getByTestId('thing-modal')).toBeInTheDocument();
    expect(screen.getByTestId('thing-modal-cancel-btn')).toBeInTheDocument();
    expect(screen.getByTestId('thing-modal-add-btn')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked and does not submit', () => {
    const { onClose, onSubmit } = renderModal();

    fireEvent.click(screen.getByTestId('thing-modal-cancel-btn'));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit when the primary button is clicked and does not close by itself', () => {
    const { onClose, onSubmit } = renderModal();

    fireEvent.click(screen.getByTestId('thing-modal-add-btn'));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses a custom submit label while keeping the add-btn test id', () => {
    renderModal({ submitLabel: 'Create' });

    expect(screen.getByRole('button', { name: 'Create' })).toHaveAttribute('data-testid', 'thing-modal-add-btn');
  });
});
