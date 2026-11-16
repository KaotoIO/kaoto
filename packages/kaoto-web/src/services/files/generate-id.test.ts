import { getRandomValues, randomUUID } from 'node:crypto';

import { generateId } from './generate-id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses crypto.randomUUID when the browser provides it', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'from-random-uuid', getRandomValues });

    expect(generateId()).toBe('from-random-uuid');
  });

  it('builds a version 4 UUID from random values outside a secure context', () => {
    vi.stubGlobal('crypto', { getRandomValues });

    const ids = new Set(Array.from({ length: 20 }, generateId));

    expect(ids.size).toBe(20);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });

  it('sets the version and variant bits whatever the random values are', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff) });

    expect(generateId()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('only holds characters the file route accepts', () => {
    vi.stubGlobal('crypto', { randomUUID });

    expect(generateId()).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
