import { act, render, renderHook, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useMemo, useState } from 'react';

import { ModelContext } from '../providers/ModelProvider';
import { useFieldValue } from './field-value';

describe('useFieldValue', () => {
  const mockModel = { name: 'Test Name' };
  const mockErrors: Record<string, string[]> = { ['#.name']: ['Name is required'] };
  const mockOnPropertyChange = vi.fn();

  const Wrapper: FunctionComponent<PropsWithChildren<{ model?: unknown; errors?: Record<string, string[]> }>> = ({
    children,
    model = mockModel,
    errors = mockErrors,
  }) => {
    const contextValue = useMemo(() => ({ model, errors, onPropertyChange: mockOnPropertyChange }), [model, errors]);
    return <ModelContext.Provider value={contextValue}>{children}</ModelContext.Provider>;
  };

  it('should return the correct value from the model', () => {
    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper: Wrapper });
    expect(result.current.value).toBe('Test Name');
  });

  it('should return the correct errors from the model', () => {
    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper: Wrapper });
    expect(result.current.errors).toEqual(['Name is required']);
  });

  it('should call onPropertyChange with the correct arguments when onChange is called', () => {
    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper: Wrapper });
    act(() => {
      result.current.onChange('New Name');
    });
    expect(mockOnPropertyChange).toHaveBeenCalledWith('name', 'New Name');
  });

  it('should return undefined for value if the property does not exist in the model', () => {
    const { result } = renderHook(() => useFieldValue<string>('nonexistent'), { wrapper: Wrapper });
    expect(result.current.value).toBeUndefined();
  });

  it('should return undefined for errors if the property does not have errors', () => {
    const { result } = renderHook(() => useFieldValue<string>('nonexistent'), { wrapper: Wrapper });
    expect(result.current.errors).toBeUndefined();
  });
  it('should reflect an externally-updated RAW value in isRaw without calling onChange', async () => {
    const mockOnPropertyChange = vi.fn();

    let externalIsRaw = false;

    // Render via a controlled component so we can drive model updates
    const TestHarness: FunctionComponent<{ model: unknown; onIsRaw: (v: boolean) => void }> = ({ model, onIsRaw }) => {
      const contextValue = useMemo(() => ({ model, errors: {}, onPropertyChange: mockOnPropertyChange }), [model]);

      const Inner = () => {
        const { isRaw } = useFieldValue<string>('#.name');
        externalIsRaw = isRaw;
        return null;
      };

      return (
        <ModelContext.Provider value={contextValue}>
          <Inner />
        </ModelContext.Provider>
      );
    };

    const Container = () => {
      const [model, setModel] = useState<unknown>({ name: 'hello' });
      return (
        <>
          <TestHarness
            model={model}
            onIsRaw={(v) => {
              externalIsRaw = v;
            }}
          />
          <button
            data-testid="update"
            onClick={() => {
              setModel({ name: 'RAW(hello)' });
            }}
          />
        </>
      );
    };

    render(<Container />);

    expect(externalIsRaw).toBe(false);

    act(() => {
      screen.getByTestId('update').click();
    });

    expect(externalIsRaw).toBe(true);
    expect(mockOnPropertyChange).not.toHaveBeenCalled();
  });
});
