import { render, renderHook } from '@testing-library/react';
import { FunctionComponent, useContext } from 'react';
import { KaotoSchemaDefinition } from '../../../../../models';
import { ArrayField } from '../fields/ArrayField/ArrayField';
import { BooleanField } from '../fields/BooleanField';
import { DisabledField } from '../fields/DisabledField';
import { ObjectField } from '../fields/ObjectField/ObjectField';
import { OneOfField } from '../fields/OneOfField/OneOfField';
import { PasswordField } from '../fields/PasswordField';
import { StringField } from '../fields/StringField';
import { FormComponentFactoryContext, FormComponentFactoryProvider } from './FormComponentFactoryProvider';

describe('FormComponentFactoryProvider', () => {
  it('should render children', () => {
    const { getByText } = render(
      <FormComponentFactoryProvider>
        <div>children</div>
      </FormComponentFactoryProvider>,
    );
    expect(getByText('children')).toBeInTheDocument();
  });

  it.each([
    [{ format: 'password' }, PasswordField],
    [{ type: 'string' }, StringField],
    [{ type: 'number' }, StringField],
    [{ type: 'integer' }, StringField],
    [{ type: 'boolean' }, BooleanField],
    [{ type: 'object' }, ObjectField],
    [{ type: 'array' }, ArrayField],
    [{ oneOf: [] }, OneOfField],
    [{ anyOf: [] }, DisabledField],
    [{}, DisabledField],
    [{ type: 'unknown' } as unknown as KaotoSchemaDefinition['schema'], DisabledField],
  ] as [KaotoSchemaDefinition['schema'], FunctionComponent][])(
    'should return the appropriate component for schema: %s',
    (schema, Field) => {
      const { result } = renderHook(() => useContext(FormComponentFactoryContext), {
        wrapper: ({ children }) => <FormComponentFactoryProvider>{children}</FormComponentFactoryProvider>,
      });

      const expected = result.current?.(schema);

      expect(expected).toBe(Field);
    },
  );
});
