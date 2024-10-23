import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AutoForm } from 'uniforms';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { SchemaService } from '../schema.service';
import { CustomNestField } from './CustomNestField';

describe('CustomNestField', () => {
  const mockSchema = {
    title: 'Test',
    type: 'object',
    additionalProperties: false,
    properties: {
      parameters: {
        type: 'object',
        title: 'Endpoint Properties',
        description: 'Endpoint properties description',
        properties: {
          timerName: {
            title: 'Timer Name',
            group: 'common',
            description: 'The name of the timer',
            type: 'string',
          },
          pattern: {
            title: 'Pattern',
            group: 'advanced',
            description:
              'Allows you to specify a custom Date pattern to use for setting the time option using URI syntax.',
            type: 'string',
          },
          secret: {
            title: 'Secret',
            group: 'secret',
            description: 'The secret',
            type: 'string',
          },
        },
      },
    },
  };

  const schemaService = new SchemaService();
  const schemaBridge = schemaService.getSchemaBridge(mockSchema);

  it('should render the component', () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <CustomNestField name="parameters" />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const inputTimerElement = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Timer Name');
    expect(inputTimerElement).toHaveLength(1);
    const inputPatternElement = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Pattern');
    expect(inputPatternElement).toHaveLength(0);
    const advancedProperties = screen.getByRole('button', { name: 'Advanced properties' });
    const secretProperties = screen.getByRole('button', { name: 'Secret properties' });
    expect(advancedProperties).toBeInTheDocument();
    expect(secretProperties).toBeInTheDocument();
  });

  it('should display the advanced properties', async () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <CustomNestField name="parameters" />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const buttonElement = screen.getByRole('button', { name: 'Advanced properties' });
    await act(async () => {
      fireEvent.click(buttonElement);
    });
    const inputPatternElement = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Pattern');
    expect(inputPatternElement).toHaveLength(1);
  });

  it('should not render the advanced properties button if no advanced properties are provided', () => {
    const mockSchema = {
      title: 'Test',
      type: 'object',
      additionalProperties: false,
      properties: {
        parameters: {
          type: 'object',
          title: 'Endpoint Properties',
          description: 'Endpoint properties description',
          properties: {
            timerName: {
              title: 'Timer Name',
              description: 'The name of the timer',
              type: 'string',
            },
          },
        },
      },
    };

    const schemaService = new SchemaService();
    const schemaBridge = schemaService.getSchemaBridge(mockSchema);

    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <CustomNestField name="parameters" />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    const inputTimerElement = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('label') === 'Timer Name');
    expect(inputTimerElement).toHaveLength(1);

    const advancedButton = screen
      .getAllByRole('button')
      .filter((button) => button.textContent === 'Advanced properties');
    expect(advancedButton).toHaveLength(0);
  });
});
