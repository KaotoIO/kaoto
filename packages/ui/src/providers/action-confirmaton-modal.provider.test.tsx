import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';
import {
  ActionConfirmationModalContext,
  ActionConfirmationModalContextProvider,
} from './action-confirmation-modal.provider';

let actionConfirmationResult: boolean | undefined;

describe('ActionConfirmationModalProvider', () => {
  beforeEach(() => {
    actionConfirmationResult = undefined;
  });

  it('calls actionConfirmation with true when Confirm button is clicked', async () => {
    render(
      <ActionConfirmationModalContextProvider>
        <TestComponent title="Permanently delete step" text="Step parameters and its children will be lost." />
      </ActionConfirmationModalContextProvider>,
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    const confirmButton = await screen.findByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmButton);

    // Wait for actionConfirmation promise to resolve
    await waitFor(() => expect(actionConfirmationResult).toEqual(true));
  });

  it('calls actionConfirmation with false when Cancel button is clicked', async () => {
    render(
      <ActionConfirmationModalContextProvider>
        <TestComponent title="Permanently delete step" text="Step parameters and its children will be lost." />
      </ActionConfirmationModalContextProvider>,
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Wait for actionConfirmation promise to resolve
    await waitFor(() => expect(actionConfirmationResult).toEqual(false));
  });

  it('should allow consumers to update the modal title and text', () => {
    const wrapper = render(
      <ActionConfirmationModalContextProvider>
        <TestComponent title="Custom title" text="Custom text" />
      </ActionConfirmationModalContextProvider>,
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

interface TestComponentProps {
  title: string;
  text: string;
}

const TestComponent: FunctionComponent<TestComponentProps> = (props) => {
  const { actionConfirmation: deleteConfirmation } = useContext(ActionConfirmationModalContext)!;

  const handleDelete = async () => {
    const confirmation = await deleteConfirmation(props);
    actionConfirmationResult = confirmation;
  };

  return <button onClick={handleDelete}>Delete</button>;
};
