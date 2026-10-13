import { CatalogKind } from '@kaoto/editor-api';
import type { MockInstance } from 'vitest';

import { getIconRequest } from './getIconRequest';
import { NodeIconResolver } from './node-icon-resolver';

describe('getIconRequest', () => {
  let mockGetIcon: MockInstance<typeof NodeIconResolver.getIcon>;
  let mockGetDefaultCamelIcon: MockInstance<typeof NodeIconResolver.getDefaultCamelIcon>;

  beforeEach(() => {
    mockGetIcon = vi.spyOn(NodeIconResolver, 'getIcon').mockResolvedValue('mock-icon-url');
    mockGetDefaultCamelIcon = vi
      .spyOn(NodeIconResolver, 'getDefaultCamelIcon')
      .mockReturnValue('default-camel-icon-url');
  });

  it('should resolve component icon request with default alt text', async () => {
    await expect(getIconRequest(CatalogKind.Component, 'kafka')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'component icon',
    });

    expect(mockGetIcon).toHaveBeenCalledWith('kafka', CatalogKind.Component);
  });

  it('should resolve kamelet icon request with prefixed name', async () => {
    await expect(getIconRequest(CatalogKind.Kamelet, 'aws-s3-source')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'Kamelet icon',
    });

    expect(mockGetIcon).toHaveBeenCalledWith('kamelet:aws-s3-source', CatalogKind.Kamelet);
  });

  it('should use custom alt text when provided', async () => {
    await expect(getIconRequest(CatalogKind.Entity, 'route', 'Route Entity')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'Route Entity',
    });

    expect(mockGetIcon).toHaveBeenCalledWith('route', CatalogKind.Entity);
  });

  it('should resolve test action alt text from catalog kind', async () => {
    await expect(getIconRequest(CatalogKind.TestAction, 'print')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'Test Action icon',
    });

    expect(mockGetIcon).toHaveBeenCalledWith('print', CatalogKind.TestAction);
  });

  it('should return default camel icon for unknown catalog kind', async () => {
    await expect(getIconRequest('unknown' as CatalogKind, 'test')).resolves.toEqual({
      icon: 'default-camel-icon-url',
      alt: 'Default icon',
    });

    expect(mockGetDefaultCamelIcon).toHaveBeenCalled();
    expect(mockGetIcon).not.toHaveBeenCalled();
  });
});
