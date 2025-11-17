import { act, renderHook } from '@testing-library/react';
import { useContext } from 'react';

import { ReloadContext, ReloadProvider } from './reload.provider';

describe('ReloadProvider', () => {
  it('ReloadContext should be undefined by default', () => {
    const wrapper = renderHook(() => useContext(ReloadContext));
    expect(wrapper.result.current).toBeUndefined();
  });

  it('should provide reloadPage and lastRender default context', () => {
    const wrapper = renderHook(() => useContext(ReloadContext), { wrapper: ReloadProvider });

    expect(wrapper.result.current?.lastRender).toEqual(expect.any(Number));
    expect(wrapper.result.current?.reloadPage).toEqual(expect.any(Function));
  });

  it('should update lastRender when reloadPage is called', async () => {
    jest.useFakeTimers();
    const wrapper = renderHook(() => useContext(ReloadContext), { wrapper: ReloadProvider });

    const initialLastRender = wrapper.result.current?.lastRender;

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await act(async () => {
      wrapper.result.current?.reloadPage();
    });

    expect(wrapper.result.current?.lastRender).not.toEqual(initialLastRender);

    jest.useRealTimers();
  });
});
