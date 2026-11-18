import { Button } from '@carbon/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { KaotoModal } from './KaotoModal';

/**
 * A field that takes the focus when the modal opens. Without one Carbon focuses the close button, whose tooltip
 * takes the first Escape for itself.
 */
const Field = () => <input aria-label="Field" data-modal-primary-focus />;

/** Carbon handles Escape only while the focus is inside the modal, which it moves there after opening */
const focusInsideModal = () =>
  vi.waitFor(() => {
    expect(screen.getByRole('textbox', { name: 'Field' })).toHaveFocus();
  });

describe('KaotoModal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    onClose.mockReset();
  });

  it('shows the title in the header and names the dialog after it', () => {
    render(
      <KaotoModal title="Rename project" onClose={onClose}>
        <p>Body text</p>
      </KaotoModal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Rename project' });
    expect(dialog).toHaveTextContent('Rename project');
    expect(dialog).toHaveTextContent('Body text');
  });

  it('shows the footer actions when given', () => {
    render(
      <KaotoModal title="Title" onClose={onClose} footer={<Button>Confirm</Button>}>
        Body
      </KaotoModal>,
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(document.querySelector('.cds--modal-footer')).toBeInTheDocument();
  });

  it('renders no footer without footer actions', () => {
    render(
      <KaotoModal title="Title" onClose={onClose}>
        Body
      </KaotoModal>,
    );

    expect(document.querySelector('.cds--modal-footer')).not.toBeInTheDocument();
  });

  it('passes size, danger, className and data-testid to the dialog', () => {
    render(
      <KaotoModal title="Title" onClose={onClose} size="sm" danger className="cs--test-modal" data-testid="test-modal">
        Body
      </KaotoModal>,
    );

    const modal = screen.getByTestId('test-modal');
    expect(modal).toHaveClass('cs--test-modal');
    expect(modal).toHaveClass('cds--modal--danger');
    expect(modal.querySelector('.cds--modal-container')).toHaveClass('cds--modal-container--sm');
  });

  it('focuses the element matched by selectorPrimaryFocus', async () => {
    render(
      <KaotoModal title="Title" onClose={onClose} selectorPrimaryFocus="#cs--test-field">
        <input id="cs--test-field" aria-label="Field" />
      </KaotoModal>,
    );

    await vi.waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Field' })).toHaveFocus();
    });
  });

  it.each([
    ['the close button', () => userEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Escape', () => userEvent.keyboard('{Escape}')],
  ])('calls onClose on %s', async (_, close) => {
    render(
      <KaotoModal title="Title" onClose={onClose}>
        <Field />
      </KaotoModal>,
    );
    await focusInsideModal();

    await close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the close button', () => userEvent.click(screen.getByRole('button', { name: 'Close' }))],
    ['Escape', () => userEvent.keyboard('{Escape}')],
  ])('stays open on %s while closing is prevented, also when that starts after the first render', async (_, close) => {
    const { rerender } = render(
      <KaotoModal title="Title" onClose={onClose}>
        <Field />
      </KaotoModal>,
    );
    rerender(
      <KaotoModal title="Title" onClose={onClose} preventClose>
        <Field />
      </KaotoModal>,
    );
    await focusInsideModal();

    await close();

    expect(onClose).not.toHaveBeenCalled();
    // Carbon hides a dialog it closes itself while it stays mounted, so check that it is still shown
    expect(screen.getByTestId('kaoto-modal')).toHaveClass('is-visible');
  });

  it('calls the onClose of the latest render on Escape', async () => {
    const firstOnClose = vi.fn();
    const { rerender } = render(
      <KaotoModal title="Title" onClose={firstOnClose}>
        <Field />
      </KaotoModal>,
    );
    rerender(
      <KaotoModal title="Title" onClose={onClose}>
        <Field />
      </KaotoModal>,
    );
    await focusInsideModal();

    await userEvent.keyboard('{Escape}');

    expect(firstOnClose).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
