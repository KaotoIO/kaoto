import { ProcessorDefinition, RouteDefinition } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

import { CatalogKind } from '../../../../catalog-kind';
import { IVisualizationNode } from '../../../base-visual-entity';
import { RootNodeMapper } from '../root-node-mapper';
import { FromNodeMapper } from './from-node-mapper';
import { noopNodeMapper } from './testing/noop-node-mapper';

describe('FromNodeMapper', () => {
  let mapper: FromNodeMapper;
  let rootNodeMapper: RootNodeMapper;
  let vizNode: IVisualizationNode;
  const path = 'route.from';
  const FROM_ENTITY = 'from' as keyof ProcessorDefinition;
  const PROCESSOR_OPTIONS = { processorName: FROM_ENTITY };

  beforeEach(async () => {
    rootNodeMapper = new RootNodeMapper();
    mapper = new FromNodeMapper(rootNodeMapper);
    rootNodeMapper.registerDefaultMapper(mapper);
    rootNodeMapper.registerMapper('log', noopNodeMapper);
    rootNodeMapper.registerMapper('setHeader', noopNodeMapper);
    rootNodeMapper.registerMapper('to', noopNodeMapper);

    const routeJson: { route: RouteDefinition } = parse(`
      route:
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

    vizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, routeJson);
  });

  it('should populate primaryNodeId', () => {
    expect(vizNode.data.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Entity });
  });

  it('should populate secondaryNodeId with component name for regular components', () => {
    expect(vizNode.data.secondaryNodeId).toEqual({ name: 'direct', catalogKind: CatalogKind.Component });
    expect(vizNode.data.tertiaryNodeId).toBeUndefined();
  });

  it('should populate secondaryNodeId and tertiaryNodeId for kamelet components', async () => {
    const kameletRouteJson: { route: RouteDefinition } = parse(`
      route:
        from:
          id: from-kamelet
          uri: kamelet:beer-source
          parameters: {}
          steps: []`);

    const kameletVizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, kameletRouteJson);

    expect(kameletVizNode.data.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Entity });
    expect(kameletVizNode.data.secondaryNodeId).toEqual({ name: 'kamelet', catalogKind: CatalogKind.Component });
    expect(kameletVizNode.data.tertiaryNodeId).toEqual({ name: 'beer-source', catalogKind: CatalogKind.Kamelet });
  });

  it('should populate secondaryNodeId and tertiaryNodeId for kamelet with query parameters', async () => {
    const kameletParamsRouteJson: { route: RouteDefinition } = parse(`
      route:
        from:
          id: from-kamelet-params
          uri: kamelet:aws-s3-sink?bucketName=test
          parameters: {}
          steps: []`);

    const kameletVizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, kameletParamsRouteJson);

    expect(kameletVizNode.data.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Entity });
    expect(kameletVizNode.data.secondaryNodeId).toEqual({ name: 'kamelet', catalogKind: CatalogKind.Component });
    expect(kameletVizNode.data.tertiaryNodeId).toEqual({ name: 'aws-s3-sink', catalogKind: CatalogKind.Kamelet });
  });

  it('should populate secondaryNodeId for timer component', async () => {
    const timerRouteJson: { route: RouteDefinition } = parse(`
      route:
        from:
          id: from-timer
          uri: timer:tick
          parameters: {}
          steps: []`);

    const timerVizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, timerRouteJson);

    expect(timerVizNode.data.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Entity });
    expect(timerVizNode.data.secondaryNodeId).toEqual({ name: 'timer', catalogKind: CatalogKind.Component });
    expect(timerVizNode.data.tertiaryNodeId).toBeUndefined();
  });

  it('should not populate secondaryNodeId when URI is missing', async () => {
    const noUriRouteJson: { route: RouteDefinition } = parse(`
      route:
        from:
          id: from-no-uri
          parameters: {}
          steps: []`);

    const noUriVizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, noUriRouteJson);

    expect(noUriVizNode.data.primaryNodeId).toEqual({ name: 'from', catalogKind: CatalogKind.Entity });
    expect(noUriVizNode.data.secondaryNodeId).toBeUndefined();
    expect(noUriVizNode.data.tertiaryNodeId).toBeUndefined();
  });

  it('should return children from from.steps', () => {
    const children = vizNode.getChildren();
    expect(children).toHaveLength(4);
    expect(children?.[0].data.path).toBe('route.from.steps.0.log');
    expect(children?.[1].data.path).toBe('route.from.steps.1.setHeader');
    expect(children?.[2].data.path).toBe('route.from.steps.2.to');
    expect(children?.[3].data.isPlaceholder).toBe(true);
  });

  it('should use path for viz node ID', () => {
    expect(vizNode.id).toBe('route.from');
  });

  it('should handle empty steps array', async () => {
    const emptyRouteJson: { route: RouteDefinition } = parse(`
      route:
        from:
          id: from-empty
          uri: direct:start
          parameters: {}
          steps: []`);

    const emptyVizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, emptyRouteJson);

    const children = emptyVizNode.getChildren();
    expect(children).toHaveLength(1);
    expect(children?.[0].data.isPlaceholder).toBe(true);
    expect(children?.[0].data.path).toBe('route.from.steps.0.placeholder');
  });

  it('should handle undefined steps', async () => {
    const undefinedRouteJson = {
      route: {
        from: {
          id: 'from-undefined',
          uri: 'direct:start',
          parameters: {},
          steps: undefined as unknown as ProcessorDefinition[],
        },
      },
    };

    const undefinedVizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, undefinedRouteJson);

    const children = undefinedVizNode.getChildren();
    expect(children).toHaveLength(1);
    expect(children?.[0].data.isPlaceholder).toBe(true);
  });

  it('should set correct processor name', () => {
    expect(vizNode.data.processorName).toBe('from');
    expect(vizNode.data.name).toBe('direct');
  });

  it('should enrich node from catalog', () => {
    // iconUrl must be non-empty: the mapper resolves the 'direct' component icon
    expect(vizNode.data.iconUrl).toBeTruthy();
    // title resolves to the component name ('direct') when the catalog has no entry in the test environment
    expect(vizNode.data.title).toBe('direct');
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
    const singleRouteJson: { route: RouteDefinition } = parse(`
      route:
        from:
          id: from-single
          uri: direct:start
          steps:
            - log:
                id: log-only
                message: single step`);

    const singleVizNode = await mapper.getVizNodeFromProcessor(path, PROCESSOR_OPTIONS, singleRouteJson);

    const children = singleVizNode.getChildren();
    expect(children).toHaveLength(2);
    expect(children?.[0].data.path).toBe('route.from.steps.0.log');
    expect(children?.[1].data.isPlaceholder).toBe(true);
  });
});
