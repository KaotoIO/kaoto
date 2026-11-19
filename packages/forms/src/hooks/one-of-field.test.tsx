import { act, render, renderHook, screen } from '@testing-library/react';
import { JSONSchema4 } from 'json-schema';
import { FunctionComponent, PropsWithChildren, useMemo, useState } from 'react';

import { CanvasFormTabsContext, CanvasFormTabsContextResult } from '../providers/canvas-form-tabs.provider';
import { ModelContext } from '../providers/ModelProvider';
import { SchemaContext, SchemaContextValue } from '../providers/SchemaProvider';
import { ROOT_PATH } from '../utils';
import { useOneOfField } from './one-of-field';

describe('useOneOfField', () => {
  const schemaA = {
    title: 'Schema A',
    type: 'object' as const,
    properties: { foo: { type: 'string' as const } },
  };
  const schemaB = {
    title: 'Schema B',
    type: 'object' as const,
    properties: { bar: { type: 'string' as const } },
  };

  const combinedSchema = {
    oneOf: [schemaA, schemaB],
  };

  // Stable context values defined once at test-suite level
  const canvasTabsValue: CanvasFormTabsContextResult = { selectedTab: 'All', setSelectedTab: vi.fn() };
  const schemaContextValue: SchemaContextValue = { schema: combinedSchema, definitions: {} };

  it('should select the correct OneOf schema when the model is updated externally', () => {
    let capturedSchema: string | undefined;

    const Inner: FunctionComponent = () => {
      const { selectedOneOfSchema } = useOneOfField(ROOT_PATH);
      capturedSchema = selectedOneOfSchema?.name;
      return null;
    };

    const TestContainer: FunctionComponent = () => {
      const [model, setModel] = useState<unknown>({ foo: 'value' });
      const modelContextValue = useMemo(() => ({ model, errors: {}, onPropertyChange: vi.fn() }), [model]);

      return (
        <CanvasFormTabsContext.Provider value={canvasTabsValue}>
          <ModelContext.Provider value={modelContextValue}>
            <SchemaContext.Provider value={schemaContextValue}>
              <Inner />
              <button
                data-testid="switch"
                onClick={() => {
                  setModel({ bar: 'value' });
                }}
              />
            </SchemaContext.Provider>
          </ModelContext.Provider>
        </CanvasFormTabsContext.Provider>
      );
    };

    render(<TestContainer />);

    // Start with a model matching Schema A (has 'foo')
    expect(capturedSchema).toBe('Schema A');

    // Externally update model to match Schema B (has 'bar')
    act(() => {
      screen.getByTestId('switch').click();
    });

    expect(capturedSchema).toBe('Schema B');
  });

  describe('onSchemaChange', () => {
    const stringSchema = { title: 'Plain text', type: 'string' as const };

    const renderOneOf = (model: unknown, selectedTab: CanvasFormTabsContextResult['selectedTab'] = 'All') => {
      const onPropertyChange = vi.fn();
      const schema = { oneOf: [schemaA, schemaB, stringSchema] };
      const wrapper = ({ children }: PropsWithChildren) => (
        <CanvasFormTabsContext.Provider value={{ selectedTab, setSelectedTab: vi.fn() }}>
          <ModelContext.Provider value={{ model, errors: {}, onPropertyChange }}>
            <SchemaContext.Provider value={{ schema, definitions: {} }}>{children}</SchemaContext.Provider>
          </ModelContext.Provider>
        </CanvasFormTabsContext.Provider>
      );
      const hook = renderHook(() => useOneOfField(ROOT_PATH), { wrapper });
      const schemaNamed = (name: string) => hook.result.current.oneOfSchemas.find((entry) => entry.name === name)!;
      return { ...hook, onPropertyChange, schemaNamed };
    };

    it('keeps the model when the selected schema is picked again', () => {
      const { result, onPropertyChange, schemaNamed } = renderOneOf({ foo: 'value' });

      act(() => {
        result.current.onSchemaChange(schemaNamed('Schema A'));
      });

      expect(onPropertyChange).not.toHaveBeenCalled();
      expect(result.current.selectedOneOfSchema?.name).toBe('Schema A');
    });

    it('replaces the properties of the previous schema with the ones of the new schema and keeps the rest', () => {
      const { result, onPropertyChange, schemaNamed } = renderOneOf({ foo: 'value', id: 'route-1' });

      act(() => {
        result.current.onSchemaChange(schemaNamed('Schema B'));
      });

      expect(onPropertyChange).toHaveBeenCalledWith(ROOT_PATH, { id: 'route-1', bar: {} });
      expect(result.current.selectedOneOfSchema?.name).toBe('Schema B');
    });

    it('starts an empty model with the properties of the new schema', () => {
      const { result, onPropertyChange, schemaNamed } = renderOneOf(undefined);

      act(() => {
        result.current.onSchemaChange(schemaNamed('Schema B'));
      });

      expect(onPropertyChange).toHaveBeenCalledWith(ROOT_PATH, { bar: {} });
    });

    it('selects a schema that is not an object without changing the model', () => {
      const { result, onPropertyChange, schemaNamed } = renderOneOf({ foo: 'value' });

      act(() => {
        result.current.onSchemaChange(schemaNamed('Plain text'));
      });

      expect(onPropertyChange).not.toHaveBeenCalled();
      expect(result.current.selectedOneOfSchema?.name).toBe('Plain text');
    });

    it('removes the properties of the selected schema when the selection is cleared', () => {
      const { result, onPropertyChange } = renderOneOf({ foo: 'value', id: 'route-1' });

      act(() => {
        result.current.onSchemaChange(undefined);
      });

      expect(onPropertyChange).toHaveBeenCalledWith(ROOT_PATH, { id: 'route-1' });
      expect(result.current.selectedOneOfSchema).toBeUndefined();
    });

    it('clears the selection of an empty model without changing it', () => {
      const { result, onPropertyChange, schemaNamed } = renderOneOf(undefined);
      act(() => {
        result.current.onSchemaChange(schemaNamed('Plain text'));
      });

      act(() => {
        result.current.onSchemaChange(undefined);
      });

      expect(onPropertyChange).not.toHaveBeenCalled();
      expect(result.current.selectedOneOfSchema).toBeUndefined();
    });
  });

  describe('shouldRender in the Modified tab', () => {
    const renderInModifiedTab = (model: unknown, schema: JSONSchema4 = combinedSchema) => {
      const wrapper = ({ children }: PropsWithChildren) => (
        <CanvasFormTabsContext.Provider value={{ selectedTab: 'Modified', setSelectedTab: vi.fn() }}>
          <ModelContext.Provider value={{ model, errors: {}, onPropertyChange: vi.fn() }}>
            <SchemaContext.Provider value={{ schema, definitions: {} }}>{children}</SchemaContext.Provider>
          </ModelContext.Provider>
        </CanvasFormTabsContext.Provider>
      );
      return renderHook(() => useOneOfField(ROOT_PATH), { wrapper }).result.current.shouldRender;
    };

    it('renders a selected schema with a value', () => {
      expect(renderInModifiedTab({ foo: 'value' })).toBe(true);
    });

    it('hides the field without a value', () => {
      expect(renderInModifiedTab(undefined)).toBe(false);
    });

    it('hides the field when the selected schema has no properties', () => {
      expect(renderInModifiedTab('text', { oneOf: [{ title: 'Plain text', type: 'string' }] })).toBe(false);
    });
  });
});
