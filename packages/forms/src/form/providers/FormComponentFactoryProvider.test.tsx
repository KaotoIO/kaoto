import { render, renderHook } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { FunctionComponent, useContext } from 'react';
import { ArrayField } from '../fields/ArrayField/ArrayField';
import { BooleanField } from '../fields/BooleanField';
import { DisabledField } from '../fields/DisabledField';
import { EnumField } from '../fields/EnumField';
import { AllOfField } from '../fields/ObjectField/AllOfField';
import { ObjectField } from '../fields/ObjectField/ObjectField';
import { OneOfField } from '../fields/OneOfField/OneOfField';
import { PasswordField } from '../fields/PasswordField';
import { PropertiesField } from '../fields/PropertiesField/PropertiesField';
import { StringField } from '../fields/StringField';
import { TextAreaField } from '../fields/TextAreaField';
import { FormComponentFactoryProvider } from './FormComponentFactoryProvider';
import { FormComponentFactoryContext } from './context/form-component-factory-context';

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
    [{ type: 'string', title: 'Expression' }, TextAreaField],
    [{ type: 'string', title: 'Description' }, TextAreaField],
    [{ type: 'string', title: 'Query' }, TextAreaField],
    [{ type: 'string', title: 'Script' }, TextAreaField],
    [{ type: 'string', enum: ['in', 'out'] }, EnumField],
    [{ type: 'object', properties: {} }, PropertiesField],
    [{ type: 'object' }, PropertiesField],
    [{ type: 'string' }, StringField],
    [{ type: 'number' }, StringField],
    [{ type: 'integer' }, StringField],
    [{ type: 'boolean' }, BooleanField],
    [{ type: 'object', properties: { name: { type: 'string' } } }, ObjectField],
    [{ type: 'array' }, ArrayField],
    [{ oneOf: [] }, OneOfField],
    [{ allOf: [] }, AllOfField],
    [{}, DisabledField],
    [{ type: 'unknown' } as unknown as JSONSchema4, DisabledField],
  ] as [JSONSchema4, FunctionComponent][])(
    'should return the appropriate component for schema: %s',
    (schema, Field) => {
      const { result } = renderHook(() => useContext(FormComponentFactoryContext), {
        wrapper: ({ children }) => <FormComponentFactoryProvider>{children}</FormComponentFactoryProvider>,
      });

      const expected = result.current?.(schema);

      expect(expected).toBe(Field);
    },
  );

  it('should throw an error when schema has an unhandled anyOf array', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error logs

    const { result } = renderHook(() => useContext(FormComponentFactoryContext), {
      wrapper: ({ children }) => <FormComponentFactoryProvider>{children}</FormComponentFactoryProvider>,
    });

    expect(() => result.current?.({ anyOf: [] } as unknown as JSONSchema4)).toThrow(
      'FormComponentFactoryProvider: AnyOf should be handled in the scope of the ObjectField',
    );

    jest.restoreAllMocks();
  });
});
