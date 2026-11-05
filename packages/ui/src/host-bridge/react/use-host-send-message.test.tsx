import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';

import type { SendMessageRequest, SendMessageRuntimeSnapshot } from '../../models/send-message-runtime';
import { createPostMessageBridge } from '../bridge';
import { IEventBus } from '../contracts';
import { createEventBus } from '../event-bus';
import { createMemoryTransports } from '../transports/memory';
import { HostBridgeProvider } from './context';
import { useHostSendMessage } from './use-host-send-message';

describe('useHostSendMessage', () => {
  it.each<SendMessageRequest['payload']>([
    {
      endpoint: 'orders',
      bodyType: 'text',
      body: 'Hello from Kaoto!',
      bodyFile: undefined,
      bodyEncoding: undefined,
      headers: { testId: 'test-001' },
    },
    {
      endpoint: 'orders',
      bodyType: 'text',
      body: undefined,
      bodyFile: undefined,
      bodyEncoding: undefined,
      headers: undefined,
    },
    {
      endpoint: 'orders',
      bodyType: 'file',
      body: undefined,
      bodyFile: { name: 'payload.bin', content: 'AP+A', type: undefined, size: undefined },
      bodyEncoding: 'base64',
      headers: undefined,
    },
  ])('sends optional dialog fields through the JSON bridge: $bodyType / $body', async (payload) => {
    const transports = createMemoryTransports();
    const hostBus = createEventBus({ role: 'host', onError: vi.fn() });
    const editorBus = createEventBus({ role: 'editor', onError: vi.fn() });
    const hostBridge = createPostMessageBridge({ bus: hostBus, transport: transports.host });
    const editorBridge = createPostMessageBridge({ bus: editorBus, transport: transports.editor });
    const received = vi.fn((_request: SendMessageRequest) => null);
    hostBus.onRequest('editor:sendMessage:getTargets', () => ({ supported: true, targets: [] }));
    hostBus.onRequest('editor:sendMessage:send', received);
    await Promise.all([hostBridge.connect(), editorBridge.connect()]);
    const { result, unmount } = renderHook(useHostSendMessage, {
      wrapper: ({ children }) => <HostBridgeProvider bus={editorBus}>{children}</HostBridgeProvider>,
    });
    try {
      await waitFor(() => {
        expect(result.current.snapshot.supported).toBe(true);
      });
      const request = { targetId: 'instance', routeId: 'orders', payload };
      await result.current.send(request);
      expect(received).toHaveBeenCalledOnce();
      expect(received.mock.calls[0][0]).toStrictEqual(JSON.parse(JSON.stringify(request)));
    } finally {
      unmount();
      hostBridge.dispose();
      editorBridge.dispose();
      hostBus.dispose();
      editorBus.dispose();
    }
  });
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
