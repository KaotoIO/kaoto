import { render } from '@testing-library/react';
import { inspect } from 'node:util';
import { useContext } from 'react';
import { KaotoSchemaDefinition } from '../../../../../../models';
import { ROOT_PATH } from '../../../../../../utils';
import { FormComponentFactoryContext } from '../../providers/FormComponentFactoryProvider';
import { SchemaContext, SchemaProvider } from '../../providers/SchemaProvider';
import { FormWrapper } from '../../testing/FormWrapper';
import { AllOfField } from './AllOfField';

describe('AllOfField', () => {
  const allOf: KaotoSchemaDefinition['schema']['anyOf'] = [
    { type: 'object', properties: { name: { type: 'string', title: 'Name' } } },
    { type: 'object', properties: { valid: { type: 'boolean', title: 'Valid' } } },
  ];

  it('should render the entire anyOf schemas', () => {
    const wrapper = render(
      <SchemaProvider schema={{ allOf }}>
        <AllOfField propName={ROOT_PATH} />
      </SchemaProvider>,
      { wrapper: FormWrapper },
    );

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
        <SchemaProvider schema={{ allOf }}>
          <AllOfField propName={ROOT_PATH} />
        </SchemaProvider>
      </FormComponentFactoryContext.Provider>,
      { wrapper: FormWrapper },
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });
});
