import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../catalog-kind';
import { getTooltipRequest } from './getTooltipRequest';

jest.mock('../../../../../../dynamic-catalog/dynamic-catalog-registry');

describe('getTooltipRequest', () => {
  let mockGetEntity: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEntity = jest.fn();
    (DynamicCatalogRegistry.get as jest.Mock).mockReturnValue({
      getEntity: mockGetEntity,
    });
  });

  it('should resolve Component tooltip from catalog', async () => {
    mockGetEntity.mockResolvedValue({
      component: { description: 'Kafka component' },
    });

    const result = await getTooltipRequest(CatalogKind.Component, 'kafka', 'fallback');

    expect(result).toBe('kafka: Kafka component');
    expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.Component, 'kafka');
  });

  it('should resolve Processor tooltip from catalog', async () => {
    mockGetEntity.mockResolvedValue({
      model: { description: 'Log processor' },
    });

    const result = await getTooltipRequest(CatalogKind.Processor, 'log', 'fallback');

    expect(result).toBe('log: Log processor');
    expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.Processor, 'log');
  });

  it('should fallback from Processor to Pattern catalog', async () => {
    mockGetEntity.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
      model: { description: 'Choice pattern' },
    });

    const result = await getTooltipRequest(CatalogKind.Pattern, 'choice', 'fallback');

    expect(result).toBe('choice: Choice pattern');
    expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.Processor, 'choice');
    expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.Pattern, 'choice');
  });

  it('should resolve Kamelet tooltip and strip prefix', async () => {
    mockGetEntity.mockResolvedValue({
      spec: { definition: { description: 'AWS S3 Source' } },
    });

    const result = await getTooltipRequest(CatalogKind.Kamelet, 'kamelet:aws-s3-source', 'fallback');

    expect(result).toBe('kamelet:aws-s3-source: AWS S3 Source');
    expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.Kamelet, 'aws-s3-source');
  });

  it('should resolve Entity tooltip from catalog', async () => {
    mockGetEntity.mockResolvedValue({
      model: { description: 'Route entity' },
    });

    const result = await getTooltipRequest(CatalogKind.Entity, 'route', 'fallback');

    expect(result).toBe('route: Route entity');
    expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.Entity, 'route');
  });

  it('should resolve TestAction tooltip from catalog', async () => {
    mockGetEntity.mockResolvedValue({
      description: 'Echo action',
    });

    const result = await getTooltipRequest(CatalogKind.TestAction, 'echo', 'fallback');

    expect(result).toBe('echo: Echo action');
    expect(mockGetEntity).toHaveBeenCalledWith(CatalogKind.TestAction, 'echo');
  });

  it('should use description fallback when catalog returns no description', async () => {
    mockGetEntity.mockResolvedValue({
      component: {},
    });

    const result = await getTooltipRequest(CatalogKind.Component, 'custom', 'Custom description');

    expect(result).toBe('custom: Custom description');
  });

  it('should use name fallback when catalog and description are empty', async () => {
    mockGetEntity.mockResolvedValue(undefined);

    const result = await getTooltipRequest(CatalogKind.Component, 'custom', '');

    expect(result).toBe('custom: custom');
  });

  it('should handle catalog errors gracefully', async () => {
    mockGetEntity.mockRejectedValue(new Error('Catalog error'));

    const result = await getTooltipRequest(CatalogKind.Component, 'kafka', 'fallback');

    expect(result).toBe('kafka: fallback');
  });
});
