import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { DeleteConfirmModal } from './DeleteConfirmModal';

const onClose = vi.fn();

const renderModal = (onDelete: () => Promise<void>) =>
  render(
    <DeleteConfirmModal heading="Delete file?" onDelete={onDelete} onClose={onClose}>
      Are you sure you want to delete <strong>a.camel.yaml</strong>?
    </DeleteConfirmModal>,
  );

describe('DeleteConfirmModal', () => {
  beforeEach(() => {
    onClose.mockReset();
  });

  it('shows the heading and what is deleted in a modal dialog', () => {
    renderModal(vi.fn());

    // The heading names the dialog, so screen readers announce it when the focus moves in
    const dialog = screen.getByRole('dialog', { name: 'Delete file?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: 'Delete file?' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Are you sure you want to delete a.camel.yaml? This action cannot be undone.');
    expect(screen.getByText('a.camel.yaml').tagName).toBe('STRONG');
  });

  it('focuses Cancel, so that Enter does not delete', async () => {
    renderModal(vi.fn());

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    });
  });

  it('deletes and closes on Delete', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    renderModal(onDelete);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables Delete while deleting', async () => {
    let finish: () => void = () => undefined;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderModal(onDelete);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    finish();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it.each([
    ['Cancel', () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['Escape', () => userEvent.keyboard('{Escape}')],
  ])('stays open on %s while deleting and closes once when the deletion is done', async (_, close) => {
    let finish: () => void = () => undefined;
    const onDelete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderModal(onDelete);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await close();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Carbon hides a dialog it closes itself while it stays mounted, so check that it is still shown
    expect(screen.getByTestId('delete-confirm-modal')).toHaveClass('is-visible');
    finish();
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it.each([
    ['Cancel', () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['Escape', () => userEvent.keyboard('{Escape}')],
  ])('closes without deleting on %s', async (_, close) => {
    const onDelete = vi.fn();
    renderModal(onDelete);

    await close();

    expect(onClose).toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it.each([
    ['an Error', new Error('The storage is blocked'), 'The storage is blocked'],
    ['a value that is not an Error', 'blocked', 'blocked'],
  ])('shows %s and stays open when deleting fails', async (_, failure, message) => {
    renderModal(vi.fn().mockRejectedValue(failure));

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Could not delete')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
