import { ProcessorDefinition, Rest } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { RootNodeMapper } from '../root-node-mapper';
import { RestDslVerbsNodeMapper } from './rest-dsl-verbs-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('RestDslVerbsNodeMapper', () => {
  let mapper: RestDslVerbsNodeMapper;
  let restDefinition: { rest: Rest };
  const path = 'rest.get.0';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();
    mapper = new RestDslVerbsNodeMapper(rootNodeMapper, 'get');

    rootNodeMapper.registerMapper('get' as keyof ProcessorDefinition, mapper);
    rootNodeMapper.registerMapper('to', noopNodeMapper);

    restDefinition = {
      rest: {
        id: 'rest-1234',
        path: '/api',
        get: [{ id: 'get-1', path: '/hello', to: { uri: 'direct:hello' } }],
      },
    };
  });

  it('should create a visualization node with correct data', () => {
    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'get' as keyof ProcessorDefinition },
      restDefinition,
    );

    expect(vizNode.data.catalogKind).toEqual(CatalogKind.Entity);
    expect(vizNode.data.name).toEqual('get');
    expect(vizNode.data.path).toEqual(path);
    expect(vizNode.data.processorName).toEqual('get');
    expect(vizNode.data.isGroup).toEqual(true);
  });

  it('should create a child node for the to directive', () => {
    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'get' as keyof ProcessorDefinition },
      restDefinition,
    );

    expect(vizNode.getChildren()).toHaveLength(1);
    expect(vizNode.getChildren()?.[0].data.path).toBe('rest.get.0.to');
  });

  it('should create a placeholder node when to is not defined', () => {
    restDefinition.rest.get = [{ id: 'get-1', path: '/hello' }];

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'get' as keyof ProcessorDefinition },
      restDefinition,
    );

    expect(vizNode.getChildren()).toHaveLength(1);
    const child = vizNode.getChildren()?.[0];
    expect(child?.data.path).toBe('rest.get.0.to.placeholder');
    expect(child?.data.isPlaceholder).toBe(true);
    expect(child?.data.name).toBe('placeholder');
  });

  describe('different HTTP methods', () => {
    it.each(['get', 'post', 'put', 'delete', 'patch', 'head'])('should handle %s method', (method) => {
      const rootNodeMapper = new RootNodeMapper();
      const methodMapper = new RestDslVerbsNodeMapper(rootNodeMapper, method);
      rootNodeMapper.registerMapper(method as keyof ProcessorDefinition, methodMapper);
      rootNodeMapper.registerMapper('to', noopNodeMapper);

      const methodPath = `rest.${method}.0`;
      const methodRestDefinition = {
        rest: {
          id: 'rest-1234',
          [method]: [{ id: `${method}-1`, path: '/test', to: { uri: 'direct:test' } }],
        },
      };

      const vizNode = methodMapper.getVizNodeFromProcessor(
        methodPath,
        { processorName: method as keyof ProcessorDefinition },
        methodRestDefinition,
      );

      expect(vizNode.data.name).toEqual(method);
      expect(vizNode.data.processorName).toEqual(method);
      expect(vizNode.getChildren()).toHaveLength(1);
    });
  });

  it('should handle multiple verb instances', () => {
    restDefinition.rest.get = [
      { id: 'get-1', path: '/hello', to: { uri: 'direct:hello' } },
      { id: 'get-2', path: '/world', to: { uri: 'direct:world' } },
    ];

    const vizNode1 = mapper.getVizNodeFromProcessor(
      'rest.get.0',
      { processorName: 'get' as keyof ProcessorDefinition },
      restDefinition,
    );
    const vizNode2 = mapper.getVizNodeFromProcessor(
      'rest.get.1',
      { processorName: 'get' as keyof ProcessorDefinition },
      restDefinition,
    );

    expect(vizNode1.data.path).toBe('rest.get.0');
    expect(vizNode2.data.path).toBe('rest.get.1');
    expect(vizNode1.getChildren()?.[0].data.path).toBe('rest.get.0.to');
    expect(vizNode2.getChildren()?.[0].data.path).toBe('rest.get.1.to');
  });

  it('should set placeholder processorName to the parent method', () => {
    restDefinition.rest.get = [{ id: 'get-1', path: '/hello' }];

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'get' as keyof ProcessorDefinition },
      restDefinition,
    );

    const placeholderChild = vizNode.getChildren()?.[0];
    expect(placeholderChild?.data.processorName).toBe('get');
  });

  it('should set placeholder catalogKind to Pattern', () => {
    restDefinition.rest.get = [{ id: 'get-1', path: '/hello' }];

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'get' as keyof ProcessorDefinition },
      restDefinition,
    );

    const placeholderChild = vizNode.getChildren()?.[0];
    expect(placeholderChild?.data.catalogKind).toBe(CatalogKind.Pattern);
  });
});
