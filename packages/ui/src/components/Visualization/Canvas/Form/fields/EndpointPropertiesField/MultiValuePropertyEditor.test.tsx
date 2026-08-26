import { FieldProps, ModelContextProvider, SchemaProvider, setValue, useFieldValue } from '@kaoto/forms';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Suspense } from 'react';
import type { Mock } from 'vitest';

import { CatalogKind } from '../../../../../../models/catalog-kind';
import { MultiValuePropertyService } from './MultiValueProperty.service';
import { MultiValuePropertyEditor } from './MultiValuePropertyEditor';

vi.mock('@kaoto/forms', async () => ({
  ...(await vi.importActual('@kaoto/forms')),
  ObjectField: (props: FieldProps) => {
    const { value, onChange, disabled } = useFieldValue(props.propName);
    return (
      <div>
        <div data-testid={`object-field-${props.propName}`}>ObjectField: {props.propName}</div>
        <div data-testid="model-context-provider-disabled">{String(disabled)}</div>
        <div data-testid="model-context-provider-model">{JSON.stringify(value)}</div>
        <button
          onClick={() => {
            onChange({ jobParameters: { name: 'updated' } });
          }}
        >
          Trigger property change
        </button>
        <button
          onClick={() => {
            onChange({ jobParameters: { name: '' } });
          }}
        >
          Delete property
        </button>
      </div>
    );
  },
  setValue: vi.fn(),
}));

const quartzMultiValueMap = new Map([
  ['jobParameters', 'job.'],
  ['triggerParameters', 'trigger.'],
]);

describe('MultiValuePropertyEditor', () => {
  const mockOnPropertyChange = vi.fn();
  const getMultiValuePropertiesSpy = vi.spyOn(MultiValuePropertyService, 'getMultiValueProperties');
  const readMultiValueSpy = vi.spyOn(MultiValuePropertyService, 'readMultiValue');
  const getMultiValueSerializedDefinitionSpy = vi.spyOn(MultiValuePropertyService, 'getMultiValueSerializedDefinition');

  const defaultProps: FieldProps = {
    propName: 'parameters',
    required: false,
  };

  const defaultSchema = {
    'x-component-name': 'quartz',
    'x-endpoint-catalog-kind': CatalogKind.Component,
  };

  const renderComponent = async ({
    schema = defaultSchema,
    model = { parameters: { 'job.name': 'daily' } },
    disabled = true,
    onPropertyChange = mockOnPropertyChange,
  }: {
    schema?: Record<string, unknown>;
    model?: Record<string, unknown>;
    disabled?: boolean;
    onPropertyChange?: Mock;
  } = {}) => {
    // eslint-disable-next-line testing-library/no-unnecessary-act
    await act(async () => {
      render(
        <SchemaProvider schema={schema}>
          <ModelContextProvider model={model} onPropertyChange={onPropertyChange} disabled={disabled}>
            <Suspense fallback={<div>Loading...</div>}>
              <MultiValuePropertyEditor {...defaultProps} />
            </Suspense>
          </ModelContextProvider>
        </SchemaProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    getMultiValuePropertiesSpy.mockResolvedValue(quartzMultiValueMap);
    readMultiValueSpy.mockReturnValue({ jobParameters: { name: 'daily' } });
    getMultiValueSerializedDefinitionSpy.mockReturnValue({
      parameters: { 'job.name': 'updated' },
    } as unknown as Record<string, string>);
  });

  it('should render the transformed model and disabled state', async () => {
    await renderComponent();

    expect(getMultiValuePropertiesSpy).toHaveBeenCalledWith(CatalogKind.Component, 'quartz');
    expect(readMultiValueSpy).toHaveBeenCalledWith(quartzMultiValueMap, { 'job.name': 'daily' });
    expect(screen.getByTestId('model-context-provider-disabled')).toHaveTextContent('true');
    expect(screen.getByTestId('model-context-provider-model')).toHaveTextContent(
      JSON.stringify({ jobParameters: { name: 'daily' } }),
    );
    expect(screen.getByTestId('object-field-parameters')).toHaveTextContent('ObjectField: parameters');
  });

  it('should serialize property changes and forward flattened parameters', async () => {
    await renderComponent();

    const triggerPropertyChangeButton = await screen.findByRole('button', { name: 'Trigger property change' });
    fireEvent.click(triggerPropertyChangeButton);

    expect(setValue).toHaveBeenCalledWith({ parameters: { jobParameters: { name: 'daily' } } }, 'parameters', {
      jobParameters: { name: 'updated' },
    });
    expect(getMultiValueSerializedDefinitionSpy).toHaveBeenCalledWith(quartzMultiValueMap, {
      parameters: { jobParameters: { name: 'daily' } },
    });
    await waitFor(() => {
      expect(mockOnPropertyChange).toHaveBeenCalledWith('parameters', { 'job.name': 'updated' });
    });
  });

  it('should use undefined catalog metadata when schema extensions are missing', async () => {
    getMultiValuePropertiesSpy.mockResolvedValue(new Map());
    await renderComponent({ schema: {} });

    expect(getMultiValuePropertiesSpy).toHaveBeenCalledWith(undefined, undefined);
    expect(readMultiValueSpy).toHaveBeenCalledWith(expect.any(Map), { 'job.name': 'daily' });
    expect(readMultiValueSpy.mock.calls[0]?.[0]).toBeInstanceOf(Map);
    expect(readMultiValueSpy.mock.calls[0]?.[0].size).toBe(0);
  });

  it('should not call onPropertyChange when serialized parameters are missing', async () => {
    getMultiValueSerializedDefinitionSpy.mockReturnValue(undefined);

    await renderComponent();

    const triggerPropertyChangeButton = await screen.findByRole('button', { name: 'Trigger property change' });
    fireEvent.click(triggerPropertyChangeButton);

    expect(mockOnPropertyChange).not.toHaveBeenCalled();
  });

  it('should delete property key when value is empty string', async () => {
    readMultiValueSpy.mockReturnValue({ jobParameters: { name: 'daily' } });
    getMultiValueSerializedDefinitionSpy.mockReturnValue({
      parameters: { 'job.description': 'test' },
    } as unknown as Record<string, string>);

    await renderComponent({
      model: { parameters: { 'job.name': 'daily', 'job.description': 'test' } },
    });

    const triggerPropertyChangeButton = await screen.findByRole('button', { name: 'Trigger property change' });
    fireEvent.click(triggerPropertyChangeButton);

    expect(setValue).toHaveBeenCalledWith({ parameters: { jobParameters: { name: 'daily' } } }, 'parameters', {
      jobParameters: { name: 'updated' },
    });

    await waitFor(() => {
      expect(mockOnPropertyChange).toHaveBeenCalledWith('parameters', { 'job.description': 'test' });
    });
  });
});
