import { Button, Stack, TextInput } from '@carbon/react';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

import { Wizard, WizardStep } from '../../../ui/src/components/Wizard';

export default {
  title: 'Components/Wizard',
  component: Wizard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A controlled, presentational wizard layout using the Carbon Design System.

## Features
- **Vertical Carbon ProgressIndicator**: Accessible navigation landmark with step labels, state icons, and interactive step transitions.
- **Focus Management**: Automatically moves focus to the step body region on step transitions.
- **Responsive Layout**: Uses CSS container queries to stack steps above content in narrow viewports (e.g. side-by-side editor panels).
- **Stateless & Controlled**: Step content unmounts when navigating; all form state lives in the parent container.
        `,
      },
    },
  },
} as Meta<typeof Wizard>;

export const Interactive: StoryFn = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({
    sourceName: '',
    endpointUrl: '',
    description: '',
  });

  const steps: WizardStep[] = [
    {
      id: 'source',
      label: 'Select source',
      content: (
        <Stack gap={5}>
          <h3>Select source</h3>
          <p>Provide the name and identifier of the integration source.</p>
          <TextInput
            id="source-name"
            labelText="Source name"
            placeholder="e.g. Orders API"
            value={formData.sourceName}
            onChange={(e) => {
              setFormData({ ...formData, sourceName: e.target.value });
            }}
          />
        </Stack>
      ),
      complete: currentIndex > 0,
    },
    {
      id: 'endpoint',
      label: 'Configure endpoint',
      secondaryLabel: 'Required',
      disabled: formData.sourceName.trim() === '',
      content: (
        <Stack gap={5}>
          <h3>Configure endpoint</h3>
          <p>Specify the target REST or Kafka endpoint URL.</p>
          <TextInput
            id="endpoint-url"
            labelText="Endpoint URL"
            placeholder="https://api.example.com/v1"
            value={formData.endpointUrl}
            onChange={(e) => {
              setFormData({ ...formData, endpointUrl: e.target.value });
            }}
          />
        </Stack>
      ),
      complete: currentIndex > 1,
    },
    {
      id: 'review',
      label: 'Review & Finish',
      disabled: formData.sourceName.trim() === '' || formData.endpointUrl.trim() === '',
      content: (
        <Stack gap={5}>
          <h3>Review & Finish</h3>
          <p>Confirm the integration details before submitting:</p>
          <p>
            <strong>Source Name:</strong> {formData.sourceName || 'Not specified'}
          </p>
          <p>
            <strong>Endpoint URL:</strong> {formData.endpointUrl || 'Not specified'}
          </p>
        </Stack>
      ),
    },
  ];

  const canGoNext =
    (currentIndex === 0 && formData.sourceName.trim().length > 0) ||
    (currentIndex === 1 && formData.endpointUrl.trim().length > 0);

  const isLastStep = currentIndex === steps.length - 1;

  const footer = (
    <>
      <Button
        kind="secondary"
        disabled={currentIndex === 0}
        onClick={() => {
          setCurrentIndex((prev) => prev - 1);
        }}
      >
        Back
      </Button>
      {isLastStep ? (
        <Button
          kind="primary"
          onClick={() => {
            alert('Wizard completed!');
          }}
        >
          Finish
        </Button>
      ) : (
        <Button
          kind="primary"
          disabled={!canGoNext}
          onClick={() => {
            setCurrentIndex((prev) => prev + 1);
          }}
        >
          Next
        </Button>
      )}
    </>
  );

  return (
    <div style={{ height: '500px' }}>
      <Wizard
        steps={steps}
        currentIndex={currentIndex}
        onStepChange={setCurrentIndex}
        footer={footer}
        stepsLabel="Import wizard steps"
      />
    </div>
  );
};

export const StepStates: StoryFn = () => {
  const steps: WizardStep[] = [
    {
      id: 'completed-step',
      label: 'Completed step',
      complete: true,
      description: 'Step 1 was validated',
      content: <p>This step is marked as complete.</p>,
    },
    {
      id: 'current-step',
      label: 'Active step',
      secondaryLabel: 'In progress',
      content: <p>This is the active step being edited.</p>,
    },
    {
      id: 'error-step',
      label: 'Invalid step',
      invalid: true,
      description: 'Contains validation errors',
      content: <p>This step has an invalid state indicator.</p>,
    },
    {
      id: 'disabled-step',
      label: 'Locked step',
      disabled: true,
      secondaryLabel: 'Requires Step 2',
      content: <p>This step is disabled and cannot be clicked.</p>,
    },
  ];

  return (
    <div style={{ height: '400px' }}>
      <Wizard
        steps={steps}
        currentIndex={1}
        onStepChange={() => {}}
        footer={<Button kind="primary">Continue</Button>}
        stepsLabel="Workflow step states"
      />
    </div>
  );
};
