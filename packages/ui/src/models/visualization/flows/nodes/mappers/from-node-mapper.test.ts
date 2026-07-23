import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { RootNodeMapper } from '../root-node-mapper';
import { FromNodeMapper } from './from-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('FromNodeMapper', () => {
  let mapper: FromNodeMapper;
  let routeDefinition: RouteDefinition;
  let rootNodeMapper: RootNodeMapper;
  let vizNode: IVisualizationNode;
  const path = 'from';
  const FROM_ENTITY = 'from' as keyof ProcessorDefinition;

  beforeEach(async () => {
    rootNodeMapper = new RootNodeMapper();
    mapper = new FromNodeMapper(rootNodeMapper);
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);
    rootNodeMapper.registerMapper('setHeader', noopNodeMapper);
    rootNodeMapper.registerMapper('to', noopNodeMapper);

    routeDefinition = parse(`
      from:
        id: from-8888
        uri: direct:start
        parameters: {}
        steps:
          - log:
              id: log-1234
              message: \${body}
          - setHeader:
              id: setHeader-5678
              name: myHeader
          - to:
              id: to-9012
              uri: direct:end`);

    vizNode = await mapper.getVizNodeFromProcessor(path, { processorName: FROM_ENTITY }, routeDefinition);
  });

  it('should populate primaryNodeId', () => {
    expect(vizNode.data.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Entity });
    expect(vizNode.data.secondaryNodeId).toBeUndefined();
  });

  it('should return children from from.steps', () => {
    const children = vizNode.getChildren();
    expect(children).toHaveLength(4);
    expect(children?.[0].data.path).toBe('from.steps.0.log');
    expect(children?.[1].data.path).toBe('from.steps.1.setHeader');
    expect(children?.[2].data.path).toBe('from.steps.2.to');
    expect(children?.[3].data.isPlaceholder).toBe(true);
  });

  it('should use path for viz node ID', () => {
    expect(vizNode.id).toBe('from');
  });

  it('should handle empty steps array', async () => {
    routeDefinition.from.steps = [];
    const emptyVizNode = await mapper.getVizNodeFromProcessor(path, { processorName: FROM_ENTITY }, routeDefinition);

    const children = emptyVizNode.getChildren();
    expect(children).toHaveLength(1);
    expect(children?.[0].data.isPlaceholder).toBe(true);
    expect(children?.[0].data.path).toBe('from.steps.0.placeholder');
  });

  it('should handle undefined steps', async () => {
    routeDefinition.from.steps = undefined as unknown as ProcessorDefinition[];
    const undefinedVizNode = await mapper.getVizNodeFromProcessor(
      path,
      { processorName: FROM_ENTITY },
      routeDefinition,
    );

    const children = undefinedVizNode.getChildren();
    expect(children).toHaveLength(1);
    expect(children?.[0].data.isPlaceholder).toBe(true);
  });

  it('should set correct processor name', () => {
    expect(vizNode.data.processorName).toBe('from');
    expect(vizNode.data.name).toBe('from');
  });

  it('should enrich node from catalog', () => {
    expect(vizNode.data.iconUrl).toBeDefined();
    expect(vizNode.data.title).toBeDefined();
  });

  it('should create linked list of step nodes', () => {
    const children = vizNode.getChildren();
    expect(children).toHaveLength(4);

    expect(children?.[0].getNextNode()).toBe(children?.[1]);
    expect(children?.[1].getPreviousNode()).toBe(children?.[0]);
    expect(children?.[1].getNextNode()).toBe(children?.[2]);
    expect(children?.[2].getPreviousNode()).toBe(children?.[1]);
    expect(children?.[2].getNextNode()).toBe(children?.[3]);
    expect(children?.[3].getPreviousNode()).toBe(children?.[2]);
  });

  it('should handle single step in from.steps', async () => {
    routeDefinition = parse(`
      from:
        id: from-single
        uri: direct:start
        steps:
          - log:
              id: log-only
              message: single step`);
    const singleVizNode = await mapper.getVizNodeFromProcessor(path, { processorName: FROM_ENTITY }, routeDefinition);

    const children = singleVizNode.getChildren();
    expect(children).toHaveLength(2);
    expect(children?.[0].data.path).toBe('from.steps.0.log');
    expect(children?.[1].data.isPlaceholder).toBe(true);
  });
});
