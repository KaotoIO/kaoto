import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mountStoreDevtoolMock } = vi.hoisted(() => ({
  mountStoreDevtoolMock: vi.fn(),
}));

vi.mock('simple-zustand-devtools', () => ({
  mountStoreDevtool: mountStoreDevtoolMock,
}));

describe('store devtools', () => {
  beforeEach(() => {
    vi.resetModules();
    mountStoreDevtoolMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not mount store devtools in the test environment', async () => {
    await import('./index');

    expect(mountStoreDevtoolMock).not.toHaveBeenCalled();
  });

  it('mounts all store devtools in the development environment', async () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('MODE', 'development');

    await import('./index');

    expect(mountStoreDevtoolMock).toHaveBeenCalledTimes(3);
  });
});
