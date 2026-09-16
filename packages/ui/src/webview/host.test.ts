import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MessageTransport } from '../host-bridge/contracts';
import { createHostTransport } from './host';

describe('createHostTransport', () => {
  afterEach(() => {
    delete window.__kaotoHost;
  });

  it('throws a clear error when the host did not define window.__kaotoHost', () => {
    expect(() => createHostTransport()).toThrow('window.__kaotoHost');
  });

  it('returns the transport created by the host', () => {
    const transport: MessageTransport = { send: vi.fn(), onMessage: vi.fn(), dispose: vi.fn() };
    window.__kaotoHost = { createTransport: vi.fn(() => transport) };

    expect(createHostTransport()).toBe(transport);
  });
});
