import { render } from '@testing-library/react';
import { inspect } from 'node:util';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';
import { KaotoSchemaDefinition } from '../../../../../../models';
import { CanvasFormTabsContext } from '../../../../../../providers';
import { ROOT_PATH } from '../../../../../../utils';
import {
  FormComponentFactoryContext,
  FormComponentFactoryProvider,
} from '../../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../../providers/ModelProvider';
import { SchemaContext } from '../../providers/SchemaProvider';
import { AnyOfField } from './AnyOfField';

describe('AnyOfField', () => {
  const anyOf: KaotoSchemaDefinition['schema']['anyOf'] = [
    { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    { type: 'object', properties: { valid: { type: 'boolean', title: 'Valid' } } },
  ];

  it('should render the entire anyOf schemas', () => {
    const wrapper = render(<AnyOfField propName={ROOT_PATH} anyOf={anyOf} />, { wrapper: formWrapper });

    const inputFields = wrapper.queryAllByRole('textbox');
    expect(inputFields).toHaveLength(1);
    expect(inputFields[0]).toHaveAttribute('name', '#.name');

    const checkboxFields = wrapper.queryAllByRole('checkbox');
    expect(checkboxFields).toHaveLength(1);
    expect(checkboxFields[0]).toHaveAttribute('name', '#.valid');
  });

  it('should set the property name and propagate the required status', () => {
    const factorySpy = jest.fn().mockReturnValue((props: Record<string, string>) => {
      const { schema } = useContext(SchemaContext);

      return (
        <>
          <article>
            <h1>Schema</h1>
            <section>{inspect(schema)}</section>
          </article>

          <article>
            <h1>Props</h1>
            <section>{inspect(props)}</section>
          </article>
        </>
      );
    });

    const wrapper = render(
      <FormComponentFactoryContext.Provider value={factorySpy}>
        <AnyOfField propName={ROOT_PATH} anyOf={anyOf} />
      </FormComponentFactoryContext.Provider>,
      { wrapper: formWrapper },
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  const formWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <CanvasFormTabsContext.Provider value={{ selectedTab: 'All', onTabChange: jest.fn() }}>
      <FormComponentFactoryProvider>
        <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
          {children}
        </ModelContextProvider>
      </FormComponentFactoryProvider>
    </CanvasFormTabsContext.Provider>
  );
});
