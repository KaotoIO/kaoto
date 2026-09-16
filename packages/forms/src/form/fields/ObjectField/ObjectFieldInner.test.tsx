import { render } from '@testing-library/react';
import { inspect } from 'node:util';
import { ROOT_PATH } from '../../utils';
import { FormComponentFactoryContext } from '../../providers/context/form-component-factory-context';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { FormWrapper } from '../../testing/FormWrapper';
import { ObjectFieldInner } from './ObjectFieldInner';

describe('ObjectFieldInner', () => {
  it('should ignore empty properties', () => {
    const wrapper = render(
      <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
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
    const factorySpy = jest.fn().mockReturnValue((props: Record<string, string>) => <pre>{inspect(props)}</pre>);
    const wrapper = render(
      <FormComponentFactoryContext.Provider value={factorySpy}>
        <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
          <SchemaProvider schema={{ type: 'object', properties: { name: { type: 'string' } }, required: ['name'] }}>
            <ObjectFieldInner propName={ROOT_PATH} requiredProperties={['name']} />
          </SchemaProvider>
        </ModelContextProvider>
      </FormComponentFactoryContext.Provider>,
      { wrapper: FormWrapper },
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
