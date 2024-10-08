import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';
import {
  ActionConfirmationButtonOption,
  ActionConfirmationModalContext,
  ActionConfirmationModalContextProvider,
} from './action-confirmation-modal.provider';
import { ButtonVariant } from '@patternfly/react-core';

let actionConfirmationResult: number | undefined;

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
    await waitFor(() => expect(actionConfirmationResult).toEqual(1));
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
    await waitFor(() => expect(actionConfirmationResult).toEqual(0));
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

  it('should show 3 options to choose', async () => {
    const wrapper = render(
      <ActionConfirmationModalContextProvider>
        <TestComponent
          title="Custom title"
          text="Custom text"
          additionalModalText="Additional text is added in the modal description"
          buttonOptions={[
            {
              index: 1,
              buttonText: 'Delete the step, and delete the file(s)',
              variant: ButtonVariant.danger,
            },
            {
              index: 2,
              buttonText: 'Delete the step, but keep the file(s)',
              variant: ButtonVariant.secondary,
              isDanger: true,
            },
          ]}
        />
      </ActionConfirmationModalContextProvider>,
    );

    act(() => {
      const deleteButton = wrapper.getByText('Delete');
      fireEvent.click(deleteButton);
    });
    const modalDialog = wrapper.getByRole('dialog');
    expect(modalDialog.textContent).toContain('Additional text is added in the modal description');
    act(() => {
      const cancelButton = wrapper.getByTestId('action-confirmation-modal-btn-0');
      expect(cancelButton.textContent).toEqual('Cancel');
      fireEvent.click(cancelButton);
    });
    await waitFor(() => {
      expect(actionConfirmationResult).toEqual(0);
    });

    act(() => {
      const deleteButton = wrapper.getByText('Delete');
      fireEvent.click(deleteButton);
    });
    act(() => {
      const deleteStepAndFileButton = wrapper.getByTestId('action-confirmation-modal-btn-1');
      expect(deleteStepAndFileButton.textContent).toEqual('Delete the step, and delete the file(s)');
      fireEvent.click(deleteStepAndFileButton);
    });
    await waitFor(() => {
      expect(actionConfirmationResult).toEqual(1);
    });

    act(() => {
      const deleteButton = wrapper.getByText('Delete');
      fireEvent.click(deleteButton);
    });
    act(() => {
      const deleteStepOnlyButton = wrapper.getByTestId('action-confirmation-modal-btn-2');
      expect(deleteStepOnlyButton.textContent).toEqual('Delete the step, but keep the file(s)');
      fireEvent.click(deleteStepOnlyButton);
    });
    await waitFor(() => {
      expect(actionConfirmationResult).toEqual(2);
    });
  });
});

interface TestComponentProps {
  title: string;
  text: string;
  additionalModalText?: string;
  buttonOptions?: ActionConfirmationButtonOption[];
}

const TestComponent: FunctionComponent<TestComponentProps> = (props) => {
  const { actionConfirmation: deleteConfirmation } = useContext(ActionConfirmationModalContext)!;

  const handleDelete = async () => {
    const confirmation = await deleteConfirmation(props);
    actionConfirmationResult = confirmation;
  };

  return <button onClick={handleDelete}>Delete</button>;
};
