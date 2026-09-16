import { act, renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { ModelContext } from '../providers/ModelProvider';
import { useFieldValue } from './field-value';

describe('useFieldValue', () => {
  const mockModel = { name: 'Test Name' };
  const mockErrors: Record<string, string[]> = { ['#.name']: ['Name is required'] };
  const mockOnPropertyChange = jest.fn();

  const Wrapper: FunctionComponent<PropsWithChildren<{ model?: unknown; errors?: Record<string, string[]> }>> = ({
    children,
    model = mockModel,
    errors = mockErrors,
  }) => (
    <ModelContext.Provider value={{ model, errors, onPropertyChange: mockOnPropertyChange }}>
      {children}
    </ModelContext.Provider>
  );

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
});
