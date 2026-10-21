import { describe, expect, it } from 'vitest';

import * as hostBridge from './index';

describe('host-bridge public API', () => {
  it('exposes only the runtime values a host needs', () => {
    expect(Object.keys(hostBridge).sort()).toEqual([
      'BridgeError',
      'createEventBus',
      'createIframeTransport',
      'createPostMessageBridge',
    ]);
  });
});
