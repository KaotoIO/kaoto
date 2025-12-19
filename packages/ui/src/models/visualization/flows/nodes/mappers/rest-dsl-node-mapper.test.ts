import { ProcessorDefinition, Rest } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { REST_DSL_VERBS, REST_ELEMENT_NAME } from '../../../../special-processors.constants';
import { RootNodeMapper } from '../root-node-mapper';
import { RestDslNodeMapper } from './rest-dsl-node-mapper';
import { RestDslVerbsNodeMapper } from './rest-dsl-verbs-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('RestDslNodeMapper', () => {
  let mapper: RestDslNodeMapper;
  let restDefinition: { rest: Rest };
  const path = 'rest';

  beforeEach(() => {
    const rootNodeMapper = new RootNodeMapper();

    mapper = new RestDslNodeMapper(rootNodeMapper);
    rootNodeMapper.registerMapper(REST_ELEMENT_NAME, mapper);

    REST_DSL_VERBS.forEach((verb) => {
      rootNodeMapper.registerMapper(
        verb as keyof ProcessorDefinition,
        new RestDslVerbsNodeMapper(rootNodeMapper, verb),
      );
    });

    rootNodeMapper.registerMapper('to', noopNodeMapper);

    restDefinition = {
      rest: {
        id: 'rest-1234',
        path: '/api',
      },
    };
  });

  it('should create a visualization node with correct data', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: REST_ELEMENT_NAME }, restDefinition);

    expect(vizNode.data.catalogKind).toEqual(CatalogKind.Entity);
    expect(vizNode.data.name).toEqual(REST_ELEMENT_NAME);
    expect(vizNode.data.path).toEqual(path);
    expect(vizNode.data.processorName).toEqual(REST_ELEMENT_NAME);
    expect(vizNode.data.isGroup).toEqual(true);
  });

  it('should return only the placeholder when no verbs are defined', () => {
    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: REST_ELEMENT_NAME }, restDefinition);

    const children = vizNode.getChildren();
    expect(children).toHaveLength(1);
    expect(children?.[0].data.isPlaceholder).toBe(true);
    expect(children?.[0].data.name).toBe('placeholder-special-child');
  });

  it('should return children for GET verb', () => {
    restDefinition.rest.get = [
      { id: 'get-1', path: '/hello', to: { uri: 'direct:hello' } },
      { id: 'get-2', path: '/world', to: { uri: 'direct:world' } },
    ];

    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: REST_ELEMENT_NAME }, restDefinition);

    // 2 GET verbs
    expect(vizNode.getChildren()).toHaveLength(2);
    expect(vizNode.getChildren()?.[0].data.path).toBe('rest.get.0');
    expect(vizNode.getChildren()?.[1].data.path).toBe('rest.get.1');
  });

  it('should return children for POST verb', () => {
    restDefinition.rest.post = [{ id: 'post-1', path: '/update', to: { uri: 'direct:update' } }];

    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: REST_ELEMENT_NAME }, restDefinition);

    // 1 POST verb
    expect(vizNode.getChildren()).toHaveLength(1);
    expect(vizNode.getChildren()?.[0].data.path).toBe('rest.post.0');
  });

  it('should return children for multiple verbs', () => {
    restDefinition.rest.get = [{ id: 'get-1', path: '/hello', to: { uri: 'direct:hello' } }];
    restDefinition.rest.post = [{ id: 'post-1', path: '/update', to: { uri: 'direct:update' } }];
    restDefinition.rest.put = [{ id: 'put-1', path: '/create', to: { uri: 'direct:create' } }];
    restDefinition.rest.delete = [{ id: 'delete-1', path: '/remove', to: { uri: 'direct:remove' } }];

    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: REST_ELEMENT_NAME }, restDefinition);

    // 4 verbs
    expect(vizNode.getChildren()).toHaveLength(4);
  });

  it('should return children for all supported verbs', () => {
    restDefinition.rest.get = [{ id: 'get-1', path: '/get', to: { uri: 'direct:get' } }];
    restDefinition.rest.post = [{ id: 'post-1', path: '/post', to: { uri: 'direct:post' } }];
    restDefinition.rest.put = [{ id: 'put-1', path: '/put', to: { uri: 'direct:put' } }];
    restDefinition.rest.delete = [{ id: 'delete-1', path: '/delete', to: { uri: 'direct:delete' } }];
    restDefinition.rest.patch = [{ id: 'patch-1', path: '/patch', to: { uri: 'direct:patch' } }];
    restDefinition.rest.head = [{ id: 'head-1', path: '/head', to: { uri: 'direct:head' } }];

    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: REST_ELEMENT_NAME }, restDefinition);

    // 6 verbs
    expect(vizNode.getChildren()).toHaveLength(6);
  });

  it('should add verb nodes as children of the rest node', () => {
    restDefinition.rest.get = [{ id: 'get-1', path: '/hello', to: { uri: 'direct:hello' } }];

    const vizNode = mapper.getVizNodeFromProcessor(path, { processorName: REST_ELEMENT_NAME }, restDefinition);

    const children = vizNode.getChildren();
    // 1 verb
    expect(children).toHaveLength(1);
    expect(children?.[0].data.name).toEqual('get');
    expect(children?.[0].data.isGroup).toEqual(true);
  });
});
