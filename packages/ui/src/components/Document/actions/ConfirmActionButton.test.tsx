import { TrashIcon } from '@patternfly/react-icons';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { ConfirmActionButton } from './ConfirmActionButton';

describe('ConfirmActionButton', () => {
  const defaultProps = {
    icon: <TrashIcon />,
    title: 'Delete item',
    triggerTestId: 'delete-item-button',
    modalTestId: 'delete-item-modal',
    confirmTestId: 'delete-item-modal-confirm-btn',
    cancelTestId: 'delete-item-modal-cancel-btn',
    modalTitle: 'Delete item',
    description: 'Are you sure you want to delete this item?',
    onConfirm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the trigger button with correct testid, title and aria-label', () => {
    render(<ConfirmActionButton {...defaultProps} />);

    const btn = screen.getByTestId('delete-item-button');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('title', 'Delete item');
    expect(btn).toHaveAttribute('aria-label', 'Delete item');
  });

  it('should not show modal on initial render', () => {
    render(<ConfirmActionButton {...defaultProps} />);

    expect(screen.queryByTestId('delete-item-modal')).not.toBeInTheDocument();
  });

  it('should open modal when trigger button is clicked', () => {
    render(<ConfirmActionButton {...defaultProps} />);

    act(() => {
      fireEvent.click(screen.getByTestId('delete-item-button'));
    });

    expect(screen.getByTestId('delete-item-modal')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('should call onConfirm and close modal when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmActionButton {...defaultProps} onConfirm={onConfirm} />);

    act(() => {
      fireEvent.click(screen.getByTestId('delete-item-button'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('delete-item-modal-confirm-btn'));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('delete-item-modal')).not.toBeInTheDocument();
  });

  it('should close modal without calling onConfirm when cancel button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmActionButton {...defaultProps} onConfirm={onConfirm} />);

    act(() => {
      fireEvent.click(screen.getByTestId('delete-item-button'));
    });
    act(() => {
      fireEvent.click(screen.getByTestId('delete-item-modal-cancel-btn'));
    });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByTestId('delete-item-modal')).not.toBeInTheDocument();
  });

  it('should render JSX description in modal body', () => {
    const description = (
      <>
        <p>First line</p>
        <p>Second line</p>
      </>
    );
    render(<ConfirmActionButton {...defaultProps} description={description} />);

    act(() => {
      fireEvent.click(screen.getByTestId('delete-item-button'));
    });

    expect(screen.getByText('First line')).toBeInTheDocument();
    expect(screen.getByText('Second line')).toBeInTheDocument();
  });
});
