import { CatalogKind } from '../../../catalog-kind';
import { noopNodeMapper } from './mappers/testing/noop-node-mapper';
import { RootNodeMapper } from './root-node-mapper';

const LOG_NODE_ID = { name: 'log', catalogKind: CatalogKind.Pattern };

describe('RootNodeMapper', () => {
  it('should allow consumers to register mappers', async () => {
    const rootNodeMapper = new RootNodeMapper();

    rootNodeMapper.registerMapper('log', noopNodeMapper);

    await expect(rootNodeMapper.getVizNodeFromProcessor('path', LOG_NODE_ID, {})).resolves.toBeDefined();
  });

  it('should allow consumers to register a default mapper', async () => {
    const rootNodeMapper = new RootNodeMapper();

    rootNodeMapper.registerDefaultMapper(noopNodeMapper);

    await expect(rootNodeMapper.getVizNodeFromProcessor('path', LOG_NODE_ID, {})).resolves.toBeDefined();
  });

  it('should throw an error when no mapper is found', async () => {
    const rootNodeMapper = new RootNodeMapper();

    await expect(rootNodeMapper.getVizNodeFromProcessor('path', LOG_NODE_ID, {})).rejects.toThrow(
      'No mapper found for processor: log',
    );
  });

  describe('getVizNodeFromProcessor', () => {
    it('should delegate to the default mapper when no mapper is found', async () => {
      const rootNodeMapper = new RootNodeMapper();
      rootNodeMapper.registerDefaultMapper(noopNodeMapper);
      vi.spyOn(noopNodeMapper, 'getVizNodeFromProcessor');

      const vizNode = await rootNodeMapper.getVizNodeFromProcessor('path', LOG_NODE_ID, {});

      expect(noopNodeMapper.getVizNodeFromProcessor).toHaveBeenCalledWith(
        'path',
        LOG_NODE_ID,
        {},
        undefined,
        undefined,
      );
      expect(vizNode).toBeDefined();
    });

    it('should delegate to the registered mapper', async () => {
      const rootNodeMapper = new RootNodeMapper();
      rootNodeMapper.registerMapper('log', noopNodeMapper);
      vi.spyOn(noopNodeMapper, 'getVizNodeFromProcessor');

      const vizNode = await rootNodeMapper.getVizNodeFromProcessor('path', LOG_NODE_ID, {});

      expect(noopNodeMapper.getVizNodeFromProcessor).toHaveBeenCalledWith(
        'path',
        LOG_NODE_ID,
        {},
        undefined,
        undefined,
      );
      expect(vizNode).toBeDefined();
    });
  });
});
