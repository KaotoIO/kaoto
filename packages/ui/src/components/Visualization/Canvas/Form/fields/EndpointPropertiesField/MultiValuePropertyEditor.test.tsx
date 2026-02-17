import { FieldProps, ModelContextProvider, SchemaProvider, setValue, useFieldValue } from '@kaoto/forms';
import { fireEvent, render, screen } from '@testing-library/react';

import { MultiValuePropertyService } from './MultiValueProperty.service';
import { MultiValuePropertyEditor } from './MultiValuePropertyEditor';

jest.mock('@kaoto/forms', () => ({
  ...jest.requireActual('@kaoto/forms'),
  ObjectField: (props: FieldProps) => {
    const { value, onChange, disabled } = useFieldValue(props.propName);
    return (
      <div>
        <div data-testid={`object-field-${props.propName}`}>ObjectField: {props.propName}</div>
        <div data-testid="model-context-provider-disabled">{String(disabled)}</div>
        <div data-testid="model-context-provider-model">{JSON.stringify(value)}</div>
        <button onClick={() => onChange({ jobParameters: { name: 'updated' } })}>Trigger property change</button>
        <button onClick={() => onChange({ jobParameters: { name: '' } })}>Delete property</button>
      </div>
    );
  },
  setValue: jest.fn(),
}));

describe('MultiValuePropertyEditor', () => {
  const mockOnPropertyChange = jest.fn();
  const readMultiValueSpy = jest.spyOn(MultiValuePropertyService, 'readMultiValue');
  const getMultiValueSerializedDefinitionSpy = jest.spyOn(
    MultiValuePropertyService,
    'getMultiValueSerializedDefinition',
  );

  const defaultProps: FieldProps = {
    propName: 'parameters',
    required: false,
  };

  const renderComponent = ({
    schema = { 'x-component-name': 'quartz' },
    model = { parameters: { 'job.name': 'daily' } },
    disabled = true,
    onPropertyChange = mockOnPropertyChange,
  }: {
    schema?: Record<string, unknown>;
    model?: Record<string, unknown>;
    disabled?: boolean;
    onPropertyChange?: jest.Mock;
  } = {}) =>
    render(
      <SchemaProvider schema={schema}>
        <ModelContextProvider model={model} onPropertyChange={onPropertyChange} disabled={disabled}>
          <MultiValuePropertyEditor {...defaultProps} />
        </ModelContextProvider>
      </SchemaProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    readMultiValueSpy.mockReturnValue({ jobParameters: { name: 'daily' } });
    getMultiValueSerializedDefinitionSpy.mockReturnValue({
      parameters: { 'job.name': 'updated' } as never,
    });
  });

  it('should render the transformed model and disabled state', () => {
    renderComponent();

    expect(readMultiValueSpy).toHaveBeenCalledWith('quartz', { 'job.name': 'daily' });
    expect(screen.getByTestId('model-context-provider-disabled')).toHaveTextContent('true');
    expect(screen.getByTestId('model-context-provider-model')).toHaveTextContent(
      JSON.stringify({ jobParameters: { name: 'daily' } }),
    );
    expect(screen.getByTestId('object-field-parameters')).toHaveTextContent('ObjectField: parameters');
  });

  it('should serialize property changes and forward flattened parameters', () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Trigger property change' }));

    expect(setValue).toHaveBeenCalledWith({ parameters: { jobParameters: { name: 'daily' } } }, 'parameters', {
      jobParameters: { name: 'updated' },
    });
    expect(getMultiValueSerializedDefinitionSpy).toHaveBeenCalledWith('quartz', {
      parameters: { jobParameters: { name: 'daily' } },
    });
    expect(mockOnPropertyChange).toHaveBeenCalledWith('parameters', { 'job.name': 'updated' });
  });

  it('should use an empty component name when schema metadata is missing', () => {
    renderComponent({ schema: {} });

    expect(readMultiValueSpy).toHaveBeenCalledWith('', { 'job.name': 'daily' });
  });

  it('should not call onPropertyChange when serialized parameters are missing', () => {
    getMultiValueSerializedDefinitionSpy.mockReturnValue(undefined);

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: 'Trigger property change' }));

    expect(mockOnPropertyChange).not.toHaveBeenCalled();
  });

  it('should delete property key when value is empty string', () => {
    readMultiValueSpy.mockReturnValue({ jobParameters: { name: 'daily' } });
    getMultiValueSerializedDefinitionSpy.mockReturnValue({
      parameters: { 'job.description': 'test' } as never,
    });

    renderComponent({
      model: { parameters: { 'job.name': 'daily', 'job.description': 'test' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Trigger property change' }));

    // When jobParameters.name is set to empty string, it should be converted to undefined
    // which causes setValue to delete the key
    expect(setValue).toHaveBeenCalledWith({ parameters: { jobParameters: { name: 'daily' } } }, 'parameters', {
      jobParameters: { name: 'updated' },
    });

    // The final serialized result should not include the deleted property
    expect(mockOnPropertyChange).toHaveBeenCalledWith('parameters', { 'job.description': 'test' });
  });
});
