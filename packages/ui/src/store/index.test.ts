import { afterEach, describe, expect, it, vi } from 'vitest';

import { mountStoresDevtools, useDocumentTreeStore, useSchemasStore, useSourceCodeStore } from './index';

describe('store devtools', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not mount store devtools in the test environment', () => {
    const mountStoreDevtoolMock = vi.fn();

    mountStoresDevtools(mountStoreDevtoolMock);

    expect(mountStoreDevtoolMock).not.toHaveBeenCalled();
  });

  it('mounts all store devtools in the development environment', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('MODE', 'development');
    const mountStoreDevtoolMock = vi.fn();

    mountStoresDevtools(mountStoreDevtoolMock);

    expect(mountStoreDevtoolMock).toHaveBeenCalledTimes(3);
    expect(mountStoreDevtoolMock).toHaveBeenCalledWith('Schemas Store', useSchemasStore);
    expect(mountStoreDevtoolMock).toHaveBeenCalledWith('SourceCode Store', useSourceCodeStore);
    expect(mountStoreDevtoolMock).toHaveBeenCalledWith('Document Tree Store', useDocumentTreeStore);
  });
});
