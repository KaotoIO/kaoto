import {
  ActionConfirmationModalContextProvider,
  ActionConfirmationModalContext,
  ActionConfirmationButtonOption,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent, useContext, useState } from 'react';
import { ButtonVariant } from '@patternfly/react-core';

export default {
  title: 'Modal/ActionConfirmationModal',
  component: ActionConfirmationModalContextProvider,
} as Meta<typeof ActionConfirmationModalContextProvider>;

type TestComponentProps = {
  title: string;
  btnTitle?: string;
  text?: string;
  additionalModalText?: string;
  buttonOptions?: Record<string, ActionConfirmationButtonOption>;
};

const TestComponent: FunctionComponent<TestComponentProps> = (props) => {
  const [confirmationResult, setConfirmationResult] = useState<string>('');
  const { actionConfirmation: deleteConfirmation } = useContext(ActionConfirmationModalContext)!;
  const handleDelete = async () => {
    const res = await deleteConfirmation(props);
    setConfirmationResult(res);
  };

  return (
    <p>
      <button onClick={handleDelete}>{props.btnTitle ?? props.title}</button>
      <br />
      <h4>{confirmationResult}</h4>
    </p>
  );
};

const Template: StoryFn<typeof ActionConfirmationModalContextProvider> = (_args) => {
  return (
    <ActionConfirmationModalContextProvider>
      <TestComponent title="Confirm / Cancel" />
      <TestComponent
        title="Custom Title"
        btnTitle="Delete step & file / Delete step only / Cancel"
        text="Modal text: Delete step & file, Delete step only or Cancel."
        additionalModalText="Additional text for 3 options modal text"
        buttonOptions={{
          'del-step-and-file': {
            buttonText: 'Delete both step and file',
            variant: ButtonVariant.danger,
          },
          'del-step-only': {
            buttonText: 'Delete the step, but keep the file',
            variant: ButtonVariant.secondary,
            isDanger: true,
          },
        }}
      />
    </ActionConfirmationModalContextProvider>
  );
};

export const ActionConfirmationModal = Template.bind({});
ActionConfirmationModal.args = {};
