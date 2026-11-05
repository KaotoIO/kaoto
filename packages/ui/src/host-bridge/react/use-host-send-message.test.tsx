import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import type { SendMessageRuntimeSnapshot } from '../../models/send-message-runtime';
import { IEventBus } from '../contracts';
import { HostBridgeProvider } from './context';
import { useHostSendMessage } from './use-host-send-message';

describe('useHostSendMessage', () => {
  it('keeps a pushed snapshot when an older initial request finishes and unsubscribes', async () => {
    let resolve!: (value: SendMessageRuntimeSnapshot) => void;
    let update!: (value: SendMessageRuntimeSnapshot) => void;
    const unsubscribe = vi.fn();
    const bus = {
      request: vi.fn(
        () =>
          new Promise<SendMessageRuntimeSnapshot>((r) => {
            resolve = r;
          }),
      ),
      on: vi.fn((_name, listener) => {
        update = listener;
        return unsubscribe;
      }),
    };
    const wrapper = ({ children }: PropsWithChildren) => (
      <HostBridgeProvider bus={bus as unknown as IEventBus}>{children}</HostBridgeProvider>
    );
    const { result, unmount } = renderHook(useHostSendMessage, { wrapper });
    const newer = {
      supported: true,
      targets: [{ id: 'new', routeId: 'orders', label: 'orders', pid: 1, state: 'Started' }],
    };
    act(() => {
      update(newer);
    });
    await act(async () => {
      resolve({ supported: true, targets: [] });
    });
    expect(result.current.snapshot).toEqual(newer);
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it('keeps unsupported hosts disabled', async () => {
    const bus = { request: vi.fn().mockRejectedValue(new Error('unsupported')), on: vi.fn(() => vi.fn()) };
    const { result } = renderHook(useHostSendMessage, {
      wrapper: ({ children }) => <HostBridgeProvider bus={bus as unknown as IEventBus}>{children}</HostBridgeProvider>,
    });
    await waitFor(() => {
      expect(bus.request).toHaveBeenCalled();
    });
    expect(result.current.snapshot).toEqual({ supported: false, targets: [] });
  });
});
