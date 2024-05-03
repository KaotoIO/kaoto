import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';
import { DeleteModalContext, DeleteModalContextProvider } from './delete-modal.provider';

let deleteConfirmationResult: boolean | undefined;

describe('DeleteModalProvider', () => {
  beforeEach(() => {
    deleteConfirmationResult = undefined;
  });

  it('calls deleteConfirmation with true when Confirm button is clicked', async () => {
    render(
      <DeleteModalContextProvider>
        <TestComponent title="Permanently delete step" text="Step parameters and its children will be lost." />
      </DeleteModalContextProvider>,
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmButton);

    // Wait for deleteConfirmation promise to resolve
    await waitFor(() => expect(deleteConfirmationResult).toEqual(true));
  });

  it('calls deleteConfirmation with false when Cancel button is clicked', async () => {
    render(
      <DeleteModalContextProvider>
        <TestComponent title="Permanently delete step" text="Step parameters and its children will be lost." />
      </DeleteModalContextProvider>,
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Wait for deleteConfirmation promise to resolve
    await waitFor(() => expect(deleteConfirmationResult).toEqual(false));
  });

  it('should allow consumers to update the modal title and text', () => {
    const wrapper = render(
      <DeleteModalContextProvider>
        <TestComponent title="Custom title" text="Custom text" />
      </DeleteModalContextProvider>,
    );

    act(() => {
      const deleteButton = wrapper.getByText('Delete');
      fireEvent.click(deleteButton);
    });

    const modalDialog = wrapper.getByRole('dialog');
    expect(modalDialog).toMatchSnapshot();

    expect(wrapper.queryByText('Custom title')).toBeInTheDocument;
    expect(wrapper.queryByText('Custom text')).toBeInTheDocument;
  });
});

const TestComponent: FunctionComponent<{ title: string; text: string }> = (props) => {
  const { deleteConfirmation } = useContext(DeleteModalContext)!;

  const handleDelete = async () => {
    const confirmation = await deleteConfirmation(props);
    deleteConfirmationResult = confirmation;
  };

  return <button onClick={handleDelete}>Delete</button>;
};
