import { renderHook } from '@testing-library/react';
import { useReload } from './reload.hook';

describe('useReload', () => {
  it('should return the Provider', () => {
    const wrapper = renderHook(() => useReload());

    expect(wrapper.result.current).toBeDefined();
    expect(wrapper.result.current).toBeInstanceOf(Function);
  });
});
