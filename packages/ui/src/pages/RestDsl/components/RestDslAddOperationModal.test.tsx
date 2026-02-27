import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RestDslAddOperationModal } from './RestDslAddOperationModal';

jest.mock('../RestDslDetails', () => ({
  getOperationFieldHelp: jest.fn(() => null),
  OperationTypeHelp: () => <div>Operation Type Help</div>,
}));

describe('RestDslAddOperationModal', () => {
  const baseProps = {
    isOpen: true,
    restId: 'rest-1',
    onClose: jest.fn(),
    onCreateOperation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal when isOpen is true', () => {
    render(<RestDslAddOperationModal {...baseProps} />);

    expect(screen.getByText('Add REST Operation')).toBeInTheDocument();
  });

  it('does not render modal when isOpen is false', () => {
    render(<RestDslAddOperationModal {...baseProps} isOpen={false} />);

    expect(screen.queryByText('Add REST Operation')).not.toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<RestDslAddOperationModal {...baseProps} />);

    expect(screen.getByLabelText(/operation id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/uri/i)).toBeInTheDocument();
  });

  it('generates random operation ID on open', () => {
    render(<RestDslAddOperationModal {...baseProps} />);

    const operationIdInput = screen.getByLabelText(/operation id/i) as HTMLInputElement;
    expect(operationIdInput.value).toMatch(/^rest-/);
  });

  it('focuses URI input on open', async () => {
    render(<RestDslAddOperationModal {...baseProps} />);

    await waitFor(() => {
      const uriInput = screen.getByLabelText(/uri/i);
      expect(uriInput).toHaveFocus();
    });
  });

  it('disables Add Operation button when URI is empty', () => {
    render(<RestDslAddOperationModal {...baseProps} />);

    const addButton = screen.getByRole('button', { name: /add operation/i });
    expect(addButton).toBeDisabled();
  });

  it('enables Add Operation button when URI is provided', async () => {
    const user = userEvent.setup();
    render(<RestDslAddOperationModal {...baseProps} />);

    const uriInput = screen.getByLabelText(/uri/i);
    await user.type(uriInput, '/users');

    const addButton = screen.getByRole('button', { name: /add operation/i });
    expect(addButton).toBeEnabled();
  });

  it('calls onCreateOperation with correct parameters', async () => {
    const user = userEvent.setup();
    render(<RestDslAddOperationModal {...baseProps} />);

    const uriInput = screen.getByLabelText(/uri/i);
    await user.type(uriInput, '/users');

    const addButton = screen.getByRole('button', { name: /add operation/i });
    fireEvent.click(addButton);

    expect(baseProps.onCreateOperation).toHaveBeenCalledWith('rest-1', 'get', expect.any(String), '/users');
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<RestDslAddOperationModal {...baseProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onCreateOperation when restId is undefined', async () => {
    const user = userEvent.setup();
    render(<RestDslAddOperationModal {...baseProps} restId={undefined} />);

    const uriInput = screen.getByLabelText(/uri/i);
    await user.type(uriInput, '/users');

    const addButton = screen.getByRole('button', { name: /add operation/i });
    fireEvent.click(addButton);

    expect(baseProps.onCreateOperation).not.toHaveBeenCalled();
  });
});
