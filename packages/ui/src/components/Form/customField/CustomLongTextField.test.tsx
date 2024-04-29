import { render, screen } from '@testing-library/react';
import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { AutoForm } from 'uniforms';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { SchemaService } from '../schema.service';
import { CustomNestField } from './CustomNestField';

describe('CustomLongTextField', () => {
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
          expression: {
            title: 'Expression',
            group: 'common',
            description: 'expression for queryInputStream',
            type: 'string',
          },
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
          saslJaasConfig: {
            title: 'Sasl Jaas Config',
            group: 'security',
            description: 'Expose the kafka sasl.jaas.config parameter',
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
    const inputExpressionElement = screen
      .getAllByRole('textbox')
      .filter((textbox) => textbox.getAttribute('data-testid') === 'long-text-field');
    expect(inputExpressionElement).toHaveLength(1);

    const securityProperties = screen.getByRole('button', { name: 'Security properties' });
    expect(securityProperties).toBeInTheDocument();
  });
});
