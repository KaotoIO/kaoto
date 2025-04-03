import { act, renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { ModelContext } from '../providers/ModelProvider';
import { useFieldValue } from './field-value';

describe('useFieldValue', () => {
  const mockModel = { name: 'Test Name' };
  const mockErrors: Record<string, string[]> = { ['#.name']: ['Name is required'] };
  const mockOnPropertyChange = jest.fn();

  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <ModelContext.Provider value={{ model: mockModel, errors: mockErrors, onPropertyChange: mockOnPropertyChange }}>
      {children}
    </ModelContext.Provider>
  );

  it('should return the correct value from the model', () => {
    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper });
    expect(result.current.value).toBe('Test Name');
  });

  it('should return the correct errors from the model', () => {
    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper });
    expect(result.current.errors).toEqual(['Name is required']);
  });

  it('should call onPropertyChange with the correct arguments when onChange is called', () => {
    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper });
    act(() => {
      result.current.onChange('New Name');
    });
    expect(mockOnPropertyChange).toHaveBeenCalledWith('name', 'New Name');
  });

  it('should return undefined for value if the property does not exist in the model', () => {
    const { result } = renderHook(() => useFieldValue<string>('nonexistent'), { wrapper });
    expect(result.current.value).toBeUndefined();
  });

  it('should return undefined for errors if the property does not have errors', () => {
    const { result } = renderHook(() => useFieldValue<string>('nonexistent'), { wrapper });
    expect(result.current.errors).toBeUndefined();
  });

  it('wraps value with RAW when not already wrapped', () => {
    const mockModel = { name: 'Test Name' };
    const mockOnPropertyChange = jest.fn();
    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <ModelContext.Provider value={{ model: mockModel, onPropertyChange: mockOnPropertyChange }}>
        {children}
      </ModelContext.Provider>
    );

    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper });
    act(() => {
      result.current.wrapValueWithRaw();
    });

    expect(mockOnPropertyChange).toHaveBeenCalledWith('name', 'RAW(Test Name)');
    expect(result.current.isRaw).toBe(true);
  });

  it('unwraps value from RAW when already wrapped', () => {
    const mockModel = { name: 'RAW(Test Name)' };
    const mockOnPropertyChange = jest.fn();
    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <ModelContext.Provider value={{ model: mockModel, onPropertyChange: mockOnPropertyChange }}>
        {children}
      </ModelContext.Provider>
    );

    const { result } = renderHook(() => useFieldValue<string>('#.name'), { wrapper });
    act(() => {
      result.current.wrapValueWithRaw();
    });

    expect(mockOnPropertyChange).toHaveBeenCalledWith('name', 'Test Name');
    expect(result.current.isRaw).toBe(false);
  });

  it('does nothing if value is not a string', () => {
    const mockModel = { name: 123 };
    const mockOnPropertyChange = jest.fn();
    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <ModelContext.Provider value={{ model: mockModel, onPropertyChange: mockOnPropertyChange }}>
        {children}
      </ModelContext.Provider>
    );

    const { result } = renderHook(() => useFieldValue<number>('#.name'), { wrapper });
    act(() => {
      result.current.wrapValueWithRaw();
    });

    expect(mockOnPropertyChange).not.toHaveBeenCalled();
    expect(result.current.isRaw).toBe(false);
  });
});
