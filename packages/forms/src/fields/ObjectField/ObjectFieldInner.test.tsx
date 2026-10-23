import { inspect } from 'node:util';

import { render } from '@testing-library/react';

import { CanvasFormTabsContext } from '../../providers/canvas-form-tabs.provider';
import { FormComponentFactoryContext } from '../../providers/context/form-component-factory-context';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { FormWrapper } from '../../testing/FormWrapper';
import { ROOT_PATH } from '../../utils';
import { ObjectFieldInner } from './ObjectFieldInner';

describe('ObjectFieldInner', () => {
  it('should ignore empty properties', () => {
    const wrapper = render(
      <ModelContextProvider model={undefined} onPropertyChange={vi.fn()}>
        <SchemaProvider schema={{ type: 'object', properties: { simple: {}, csimple: {}, name: { type: 'string' } } }}>
          <ObjectFieldInner propName={ROOT_PATH} requiredProperties={[]} />
        </SchemaProvider>
      </ModelContextProvider>,
      { wrapper: FormWrapper },
    );

    const inputFields = wrapper.queryAllByRole('textbox');
    expect(inputFields).toHaveLength(1);
  });

  it('should set the property name and propagate the required status', () => {
    const factorySpy = vi.fn().mockReturnValue((props: Record<string, string>) => <pre>{inspect(props)}</pre>);
    const wrapper = render(
      <FormComponentFactoryContext.Provider value={factorySpy}>
        <ModelContextProvider model={undefined} onPropertyChange={vi.fn()}>
          <SchemaProvider schema={{ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }}>
            <ObjectFieldInner propName={ROOT_PATH} requiredProperties={['name']} />
          </SchemaProvider>
        </ModelContextProvider>
      </FormComponentFactoryContext.Provider>,
      { wrapper: FormWrapper },
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should return null when selectedTab is "Required" and no properties are required and none have values', () => {
    const wrapper = render(
      <CanvasFormTabsContext.Provider value={{ selectedTab: 'Required', setSelectedTab: vi.fn() }}>
        <ModelContextProvider model={{}} onPropertyChange={vi.fn()}>
          <SchemaProvider
            schema={{
              type: 'object',
              properties: {
                optionalField: { type: 'string' },
                anotherOptional: { type: 'string' },
              },
            }}
          >
            <ObjectFieldInner propName={ROOT_PATH} requiredProperties={[]} />
          </SchemaProvider>
        </ModelContextProvider>
      </CanvasFormTabsContext.Provider>,
      { wrapper: FormWrapper },
    );

    // No DOM output — the Stack is not rendered
    expect(wrapper.container.firstChild).toBeNull();
  });
});
