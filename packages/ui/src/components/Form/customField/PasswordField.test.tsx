import { AutoField } from '@kaoto-next/uniforms-patternfly';
import { CustomAutoFieldDetector } from '../CustomAutoField';
import { AutoForm } from 'uniforms';
import { PasswordField } from './PasswordField';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { SchemaService } from '../schema.service';

describe('PasswordField', () => {
  const mockSchema = {
    title: 'Test',
    type: 'object',
    additionalProperties: false,
    properties: {
      secret: {
        title: 'Secret',
        group: 'secret',
        format: 'password',
        description: 'The secret',
        type: 'string',
      },
    },
  };
  const mockOnChange = jest.fn();
  const schemaService = new SchemaService();
  const schemaBridge = schemaService.getSchemaBridge(mockSchema);

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('should render the component', async () => {
    render(
      <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
        <AutoForm schema={schemaBridge!}>
          <PasswordField name="secret" />
        </AutoForm>
      </AutoField.componentDetectorContext.Provider>,
    );
    let input = screen.getByTestId('password-field');
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('type')).toEqual('password');
    await act(async () => {
      fireEvent.input(input, { target: { value: 'passwd' } });
    });
    const toggle = screen.getByTestId('password-show-hide-button');
    await act(async () => {
      fireEvent.click(toggle);
    });
    input = screen.getByTestId('password-field');
    expect(input.getAttribute('type')).toEqual('text');
  });
});
