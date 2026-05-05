import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../catalog-kind';
import { NodeTitleResolver } from './node-title-resolver';

jest.mock('../../../../../../dynamic-catalog/dynamic-catalog-registry');

describe('NodeTitleResolver', () => {
  const mockRegistry = {
    getEntity: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (DynamicCatalogRegistry.get as jest.Mock).mockReturnValue(mockRegistry);
  });

  describe('getComponentTitle', () => {
    it('should resolve title for a Camel component', async () => {
      mockRegistry.getEntity.mockResolvedValue({
        component: { title: 'Timer Component' },
      });

      const title = await NodeTitleResolver.getComponentTitle('timer');

      expect(mockRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Component, 'timer');
      expect(title).toBe('Timer Component');
    });

    it('should fallback to name if component not found', async () => {
      mockRegistry.getEntity.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getComponentTitle('missing');

      expect(title).toBe('missing');
    });
  });

  describe('getKameletTitle', () => {
    it('should resolve title for a Kamelet', async () => {
      mockRegistry.getEntity.mockResolvedValue({
        spec: { definition: { title: 'Kafka Source' } },
      });

      const title = await NodeTitleResolver.getKameletTitle('kafka-source');

      expect(mockRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Kamelet, 'kafka-source');
      expect(title).toBe('Kafka Source');
    });

    it('should fallback to name if kamelet not found', async () => {
      mockRegistry.getEntity.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getKameletTitle('missing');

      expect(title).toBe('missing');
    });
  });

  describe('getProcessorTitle', () => {
    it('should resolve title from component name if provided', async () => {
      mockRegistry.getEntity.mockResolvedValue({
        component: { title: 'Timer' },
      });

      const title = await NodeTitleResolver.getProcessorTitle('from', 'timer');

      expect(mockRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Component, 'timer');
      expect(title).toBe('Timer');
    });

    it('should resolve title from kamelet if component name has kamelet prefix', async () => {
      mockRegistry.getEntity.mockResolvedValue({
        spec: { definition: { title: 'Kafka Source' } },
      });

      const title = await NodeTitleResolver.getProcessorTitle('from', 'kamelet:kafka-source');

      expect(mockRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Kamelet, 'kafka-source');
      expect(title).toBe('Kafka Source');
    });

    it('should resolve title from processor if no component name', async () => {
      mockRegistry.getEntity.mockResolvedValue({
        model: { title: 'Log EIP' },
      });

      const title = await NodeTitleResolver.getProcessorTitle('log');

      expect(mockRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Processor, 'log');
      expect(title).toBe('Log EIP');
    });

    it('should fallback to processor name if not found', async () => {
      mockRegistry.getEntity.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getProcessorTitle('missing');

      expect(title).toBe('missing');
    });
  });

  describe('getEntityTitle', () => {
    it('should resolve title for an entity', async () => {
      mockRegistry.getEntity.mockResolvedValue({
        model: { title: 'Error Handler' },
      });

      const title = await NodeTitleResolver.getEntityTitle('errorHandler');

      expect(mockRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.Entity, 'errorHandler');
      expect(title).toBe('Error Handler');
    });

    it('should fallback to formatted name if entity not found', async () => {
      mockRegistry.getEntity.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getEntityTitle('missing');

      expect(title).toBe('Missing');
    });
  });

  describe('getTestActionTitle', () => {
    it('should resolve title for a test action', async () => {
      mockRegistry.getEntity.mockResolvedValue({
        title: 'Send Action',
      });

      const title = await NodeTitleResolver.getTestActionTitle('send');

      expect(mockRegistry.getEntity).toHaveBeenCalledWith(CatalogKind.TestAction, 'send');
      expect(title).toBe('Send Action');
    });

    it('should fallback to name if test action not found', async () => {
      mockRegistry.getEntity.mockResolvedValue(undefined);

      const title = await NodeTitleResolver.getTestActionTitle('missing');

      expect(title).toBe('missing');
    });
  });
});
