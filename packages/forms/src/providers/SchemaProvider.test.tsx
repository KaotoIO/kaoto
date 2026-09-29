import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';
import { SchemaContext, SchemaProvider } from './SchemaProvider';
import { KaotoSchemaDefinition } from '../models';
import { SchemaDefinitionsProvider } from './SchemaDefinitionsProvider';

describe('SchemaProvider', () => {
  const schema: JSONSchema4 = {
    type: 'object',
    properties: {
      foo: {
        $ref: '#/definitions/foo',
      },
      bar: {
        type: 'string',
      },
    },
    anyOf: [{ $ref: '#/definitions/foo' }, { type: 'number' }],
    oneOf: [{ $ref: '#/definitions/foo' }, { type: 'number' }],
    definitions: {
      foo: {
        type: 'string',
      },
    },
  };

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <SchemaDefinitionsProvider schema={schema} omitFields={[]}>
      <SchemaProvider schema={schema}>{children}</SchemaProvider>
    </SchemaDefinitionsProvider>
  );

  it('should have a include the definitions object from the `SchemaDefinitionsContext` context', () => {
    const { result } = renderHook(() => useContext(SchemaContext), { wrapper });

    expect(result.current.definitions).toEqual(schema.definitions);
  });

  it('should resolve first-level properties using the `SchemaDefinitionsContext` context', () => {
    const localSchema: JSONSchema4 = {
      $ref: '#/definitions/foo',
      definitions: {
        foo: {
          type: 'string',
        },
      },
    };
    const localWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <SchemaDefinitionsProvider schema={localSchema} omitFields={[]}>
        <SchemaProvider schema={localSchema}>{children}</SchemaProvider>
      </SchemaDefinitionsProvider>
    );

    const { result } = renderHook(() => useContext(SchemaContext), { wrapper: localWrapper });

    expect(result.current.schema).toEqual({
      type: 'string',
      definitions: {
        foo: {
          type: 'string',
        },
      },
    });
  });

  it('should not resolve second-level properties using the `SchemaDefinitionsContext` context', () => {
    const { result } = renderHook(() => useContext(SchemaContext), { wrapper });

    expect(result.current.schema.properties).toEqual({
      foo: { $ref: '#/definitions/foo' },
      bar: { type: 'string' },
    });
  });

  it('should resolve anyOf properties using the `SchemaDefinitionsContext` context', () => {
    const { result } = renderHook(() => useContext(SchemaContext), { wrapper });

    expect(result.current.schema.anyOf).toEqual([{ type: 'string' }, { type: 'number' }]);
  });

  it('should resolve oneO properties using the `SchemaDefinitionsContext` context', () => {
    const { result } = renderHook(() => useContext(SchemaContext), { wrapper });

    expect(result.current.schema.oneOf).toEqual([{ type: 'string' }, { type: 'number' }]);
  });

  it('should omit given fields', () => {
    const localWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <SchemaDefinitionsProvider schema={schema} omitFields={['bar']}>
        <SchemaProvider schema={schema}>{children}</SchemaProvider>
      </SchemaDefinitionsProvider>
    );

    const { result } = renderHook(() => useContext(SchemaContext), { wrapper: localWrapper });

    expect(result.current.schema.properties).toEqual({
      foo: {
        $ref: '#/definitions/foo',
      },
    });
  });
});
