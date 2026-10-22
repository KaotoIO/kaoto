import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { BridgeError, type IEventBus } from '../contracts';
import { HostBridgeProvider } from './context';
import { useHostSuggestions } from './use-host-suggestions';

describe('useHostSuggestions', () => {
  const createWrapper =
    (bus: IEventBus): React.FC<PropsWithChildren> =>
    ({ children }) => <HostBridgeProvider bus={bus}>{children}</HostBridgeProvider>;

  it('returns suggestions from the bus', async () => {
    const bus: Partial<IEventBus> = {
      request: vi.fn().mockResolvedValue({
        suggestions: [{ label: 'bean1', value: 'bean1' }],
      }),
    };

    const { result } = renderHook(() => useHostSuggestions(), {
      wrapper: createWrapper(bus as IEventBus),
    });

    const suggestions = await result.current.getSuggestions('bean', 'be', { scope: 'test', unused: undefined });
    expect(suggestions).toEqual([{ label: 'bean1', value: 'bean1' }]);
    expect(bus.request).toHaveBeenCalledWith('editor:suggestions:get', {
      topic: 'bean',
      word: 'be',
      context: { scope: 'test' },
    });
  });

  it('returns empty array when suggestions are unsupported', async () => {
    const bus: Partial<IEventBus> = {
      request: vi.fn().mockRejectedValue(new BridgeError('UNSUPPORTED_REQUEST', 'No handler')),
    };

    const { result } = renderHook(() => useHostSuggestions(), {
      wrapper: createWrapper(bus as IEventBus),
    });

    const suggestions = await result.current.getSuggestions('bean', 'be');
    expect(suggestions).toEqual([]);
  });

  it('rethrows other bridge errors', async () => {
    const timeoutError = new BridgeError('TIMEOUT', 'The request timed out');
    const bus: Partial<IEventBus> = {
      request: vi.fn().mockRejectedValue(timeoutError),
    };

    const { result } = renderHook(() => useHostSuggestions(), {
      wrapper: createWrapper(bus as IEventBus),
    });

    await expect(result.current.getSuggestions('bean', 'be')).rejects.toThrow(timeoutError);
  });
});
