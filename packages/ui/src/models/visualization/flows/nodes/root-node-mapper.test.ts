import { noopNodeMapper } from './mappers/testing/noop-node-mapper';
import { RootNodeMapper } from './root-node-mapper';

describe('RootNodeMapper', () => {
  it('should allow consumers to register mappers', () => {
    const rootNodeMapper = new RootNodeMapper();

    rootNodeMapper.registerMapper('log', noopNodeMapper);

    expect(() => rootNodeMapper.getVizNodeFromProcessor('path', { processorName: 'log' }, {})).not.toThrow();
  });

  it('should allow consumers to register a default mapper', () => {
    const rootNodeMapper = new RootNodeMapper();

    rootNodeMapper.registerDefaultMapper(noopNodeMapper);

    expect(() => rootNodeMapper.getVizNodeFromProcessor('path', { processorName: 'log' }, {})).not.toThrow();
  });

  it('should throw an error when no mapper is found', () => {
    const rootNodeMapper = new RootNodeMapper();

    expect(() => rootNodeMapper.getVizNodeFromProcessor('path', { processorName: 'log' }, {})).toThrowError(
      'No mapper found for processor: log',
    );
  });

  describe('getVizNodeFromProcessor', () => {
    it('should delegate to the default mapper when no mapper is found', () => {
      const rootNodeMapper = new RootNodeMapper();
      rootNodeMapper.registerDefaultMapper(noopNodeMapper);
      jest.spyOn(noopNodeMapper, 'getVizNodeFromProcessor');

      const vizNode = rootNodeMapper.getVizNodeFromProcessor('path', { processorName: 'log' }, {});

      expect(noopNodeMapper.getVizNodeFromProcessor).toHaveBeenCalledWith('path', { processorName: 'log' }, {});
      expect(vizNode).toBeDefined();
    });

    it('should delegate to the registered mapper', () => {
      const rootNodeMapper = new RootNodeMapper();
      rootNodeMapper.registerMapper('log', noopNodeMapper);
      jest.spyOn(noopNodeMapper, 'getVizNodeFromProcessor');

      const vizNode = rootNodeMapper.getVizNodeFromProcessor('path', { processorName: 'log' }, {});

      expect(noopNodeMapper.getVizNodeFromProcessor).toHaveBeenCalledWith('path', { processorName: 'log' }, {});
      expect(vizNode).toBeDefined();
    });
  });
});
