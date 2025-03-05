import { renderHook } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useContext } from 'react';
import { ModelContext, ModelContextProvider } from './ModelProvider';

describe('ModelContextProvider', () => {
  it('should have a default value', () => {
    const { result } = renderHook(() => useContext(ModelContext));

    expect(result.current.model).toBeDefined();
    expect(result.current.onPropertyChange).toBeDefined();
  });

  it('should return the provided value', () => {
    const model = { foo: 'bar' };
    const errors: Record<string, string[]> = { foo: ['error'] };
    const onPropertyChange = jest.fn();

    const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
      <ModelContextProvider model={model} errors={errors} onPropertyChange={onPropertyChange}>
        {children}
      </ModelContextProvider>
    );

    const { result } = renderHook(() => useContext(ModelContext), { wrapper });

    expect(result.current.model).toEqual(model);
    expect(result.current.errors).toEqual(errors);
    expect(result.current.onPropertyChange).toEqual(onPropertyChange);
  });
});
