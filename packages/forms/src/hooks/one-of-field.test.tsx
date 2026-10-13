import { act, render, screen } from '@testing-library/react';
import { FunctionComponent, useMemo, useState } from 'react';

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
});
