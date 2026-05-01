import { CatalogKind } from '../../../../../catalog-kind';
import { getIconRequest } from './getIconRequest';
import { NodeIconResolver } from './node-icon-resolver';

jest.mock('./node-icon-resolver');

describe('getIconRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NodeIconResolver.getIcon as jest.Mock).mockResolvedValue('mock-icon-url');
    (NodeIconResolver.getDefaultCamelIcon as jest.Mock).mockReturnValue('default-camel-icon-url');
  });

  it('should resolve component icon request with default alt text', async () => {
    await expect(getIconRequest(CatalogKind.Component, 'kafka')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'component icon',
    });

    expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('kafka', CatalogKind.Component);
  });

  it('should resolve kamelet icon request with prefixed name', async () => {
    await expect(getIconRequest(CatalogKind.Kamelet, 'aws-s3-source')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'Kamelet icon',
    });

    expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('kamelet:aws-s3-source', CatalogKind.Kamelet);
  });

  it('should use custom alt text when provided', async () => {
    await expect(getIconRequest(CatalogKind.Entity, 'route', 'Route Entity')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'Route Entity',
    });

    expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('route', CatalogKind.Entity);
  });

  it('should resolve test action alt text from catalog kind', async () => {
    await expect(getIconRequest(CatalogKind.TestAction, 'print')).resolves.toEqual({
      icon: 'mock-icon-url',
      alt: 'Test Action icon',
    });

    expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('print', CatalogKind.TestAction);
  });

  it('should return default camel icon for unknown catalog kind', async () => {
    await expect(getIconRequest('unknown' as CatalogKind, 'test')).resolves.toEqual({
      icon: 'default-camel-icon-url',
      alt: 'Default icon',
    });

    expect(NodeIconResolver.getDefaultCamelIcon).toHaveBeenCalled();
    expect(NodeIconResolver.getIcon).not.toHaveBeenCalled();
  });
});
