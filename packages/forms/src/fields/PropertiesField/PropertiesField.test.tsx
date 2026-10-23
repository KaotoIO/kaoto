import { fireEvent, render, screen } from '@testing-library/react';

import { ModelContextProvider, SchemaProvider } from '../../providers';
import { PropertiesField } from './PropertiesField';

describe('PropertiesField', () => {
  const PROP_NAME = 'parameters';

  const renderField = ({
    model = {},
    schema = { title: 'test parameters', type: 'object' },
    propName = PROP_NAME,
    disabled,
    onPropertyChange = vi.fn(),
  }: {
    model?: Record<string, unknown>;
    schema?: Record<string, unknown>;
    propName?: string;
    disabled?: boolean;
    onPropertyChange?: (propName: string, value: unknown) => void;
  } = {}) =>
    render(
      <ModelContextProvider model={model} onPropertyChange={onPropertyChange} disabled={disabled}>
        <SchemaProvider schema={schema}>
          <PropertiesField propName={propName} />
        </SchemaProvider>
      </ModelContextProvider>,
    );

  it('should render the capitalized schema title', () => {
    const { container } = renderField();

    expect(container.querySelector('label')).toHaveTextContent('Test parameters');
  });

  it('should fall back to the last segment of the propName when the schema has no title', () => {
    const { container } = renderField({ schema: { type: 'object' }, propName: 'parent.child' });

    expect(container.querySelector('label')).toHaveTextContent('Child');
  });

  it('should render no properties when there is no value', () => {
    const { container } = renderField();

    expect(container.querySelector('label')).toHaveTextContent('Test parameters 0');
    expect(screen.queryAllByTestId(`${PROP_NAME}__key`)).toHaveLength(0);
  });

  it('should render the existing properties and their count', () => {
    const { container } = renderField({ model: { [PROP_NAME]: { key1: 'value1', key2: 'value2' } } });

    expect(container.querySelector('label')).toHaveTextContent('Test parameters 2');
    expect(screen.getByDisplayValue('key1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('value1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('key2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('value2')).toBeInTheDocument();
  });

  it('should propagate changes through onPropertyChange', () => {
    const onPropertyChange = vi.fn();
    renderField({ model: { [PROP_NAME]: { key1: 'value1' } }, onPropertyChange });

    fireEvent.change(screen.getByDisplayValue('value1'), { target: { value: 'newValue' } });

    expect(onPropertyChange).toHaveBeenCalledWith(PROP_NAME, { key1: 'newValue' });
  });

  it('should disable the add button when the model context is disabled', () => {
    renderField({ disabled: true });

    expect(screen.getByTestId(`${PROP_NAME}__add`)).toBeDisabled();
  });
});
