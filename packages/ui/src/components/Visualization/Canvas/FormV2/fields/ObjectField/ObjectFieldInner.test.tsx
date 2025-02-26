import { inspect } from 'node:util';
import { render } from '@testing-library/react';
import { ObjectFieldInner } from './ObjectFieldInner';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaProvider } from '../../providers/SchemaProvider';
import { ROOT_PATH } from '../../../../../../utils';
import {
  FormComponentFactoryContext,
  FormComponentFactoryProvider,
} from '../../providers/FormComponentFactoryProvider';
import { CanvasFormTabsContext } from '../../../../../../providers';
import { FunctionComponent, PropsWithChildren } from 'react';

describe('ObjectFieldInner', () => {
  it('should ignore empty properties', () => {
    const wrapper = render(
      <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
        <SchemaProvider schema={{ type: 'object', properties: { simple: {}, csimple: {}, name: { type: 'string' } } }}>
          <ObjectFieldInner propName={ROOT_PATH} requiredProperties={[]} />
        </SchemaProvider>
      </ModelContextProvider>,
      { wrapper: formWrapper },
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
      { wrapper: formWrapper },
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  const formWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <CanvasFormTabsContext.Provider value={{ selectedTab: 'All', onTabChange: jest.fn() }}>
      <FormComponentFactoryProvider>{children}</FormComponentFactoryProvider>
    </CanvasFormTabsContext.Provider>
  );
});
