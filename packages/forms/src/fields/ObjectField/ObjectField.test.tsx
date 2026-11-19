import { act, fireEvent, render, screen } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { PropsWithChildren } from 'react';

import { CanvasFormTabsContext } from '../../providers/canvas-form-tabs.provider';
import { FormComponentFactoryProvider } from '../../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { ROOT_PATH } from '../../utils';
import { ObjectField } from './ObjectField';

const schema: JSONSchema4 = {
  type: 'object',
  title: 'Connection',
  properties: { host: { type: 'string', title: 'Host' } },
};

const renderObjectField = ({
  model,
  propName = '#.connection',
  fieldSchema = schema,
  onRemove,
}: { model?: unknown; propName?: string; fieldSchema?: JSONSchema4; onRemove?: (propName: string) => void } = {}) => {
  const onPropertyChange = vi.fn();
  const wrapper = ({ children }: PropsWithChildren) => (
    <CanvasFormTabsContext.Provider value={{ selectedTab: 'All', setSelectedTab: vi.fn() }}>
      <FormComponentFactoryProvider>
        <ModelContextProvider model={model} onPropertyChange={onPropertyChange}>
          <SchemaProvider schema={fieldSchema}>{children}</SchemaProvider>
        </ModelContextProvider>
      </FormComponentFactoryProvider>
    </CanvasFormTabsContext.Provider>
  );
  render(<ObjectField propName={propName} onRemove={onRemove} />, { wrapper });
  return { onPropertyChange };
};

describe('ObjectField', () => {
  it('shows the properties of an object that has a value', () => {
    renderObjectField({ model: { connection: { host: 'localhost' } } });

    expect(screen.getByRole('textbox', { name: /Host/ })).toBeInTheDocument();
    expect(screen.getByTestId('#.connection__remove')).toBeInTheDocument();
  });

  it('shows the properties of an object without a value once it is set', () => {
    renderObjectField();
    expect(screen.queryByRole('textbox', { name: /Host/ })).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByTestId('#.connection__set'));
    });

    expect(screen.getByRole('textbox', { name: /Host/ })).toBeInTheDocument();
  });

  it('clears the object and hides its properties when it is removed', () => {
    const { onPropertyChange } = renderObjectField({ model: { connection: { host: 'localhost' } } });

    act(() => {
      fireEvent.click(screen.getByTestId('#.connection__remove'));
    });

    expect(onPropertyChange).toHaveBeenCalledWith('connection', undefined);
    expect(screen.queryByRole('textbox', { name: /Host/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('#.connection__set')).toBeInTheDocument();
  });

  it('leaves the removal to the parent field when it handles it', () => {
    const onRemove = vi.fn();
    const { onPropertyChange } = renderObjectField({ model: { connection: { host: 'localhost' } }, onRemove });

    act(() => {
      fireEvent.click(screen.getByTestId('#.connection__remove'));
    });

    expect(onRemove).toHaveBeenCalledWith('#.connection');
    expect(onPropertyChange).not.toHaveBeenCalled();
  });

  it.each([
    ['the root object', ROOT_PATH, schema],
    ['an object without a title', '#.connection', { ...schema, title: undefined }],
  ])('shows the properties of %s directly, without a frame to set or remove it', (_, propName, fieldSchema) => {
    renderObjectField({ propName, fieldSchema });

    expect(screen.getByRole('textbox', { name: /Host/ })).toBeInTheDocument();
    expect(screen.queryByTestId(`${propName}__field-wrapper`)).not.toBeInTheDocument();
  });
});
