import { ProcessorDefinition, RouteConfigurationDefinition } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../../../catalog-kind';
import { RootNodeMapper } from '../root-node-mapper';
import { BaseNodeMapper } from './base-node-mapper';
import { RouteConfigurationNodeMapper } from './route-configuration-node-mapper';

describe('RouteConfigurationNodeMapper', () => {
  let mapper: RouteConfigurationNodeMapper;
  let rootNodeMapper: RootNodeMapper;
  const path = 'routeConfiguration';

  beforeEach(() => {
    rootNodeMapper = new RootNodeMapper();
    mapper = new RouteConfigurationNodeMapper(rootNodeMapper);
    rootNodeMapper.registerMapper('routeConfiguration' as keyof ProcessorDefinition, mapper);
    rootNodeMapper.registerDefaultMapper(new BaseNodeMapper(rootNodeMapper));
  });

  it('should create a visualization node with correct data', () => {
    const entityDef = { routeConfiguration: {} };
    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    expect(vizNode.data.catalogKind).toEqual(CatalogKind.Entity);
    expect(vizNode.data.name).toEqual('routeConfiguration');
    expect(vizNode.data.path).toEqual(path);
    expect(vizNode.data.isGroup).toEqual(true);
  });

  it('should return one placeholder per branch type when routeConfiguration is empty', () => {
    const entityDef = { routeConfiguration: {} };
    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    expect(children).toHaveLength(5);
    children?.forEach((c) => {
      expect(c.data.isPlaceholder).toBe(true);
    });
  });

  it('should return children when routeConfiguration has config items', () => {
    const entityDef: { routeConfiguration: RouteConfigurationDefinition } = {
      routeConfiguration: {
        intercept: [{ intercept: { id: 'intercept-1' } }],
      },
    };

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    // One placeholder + one intercept node for intercept branch, plus 4 placeholders for other branches
    expect(children).toHaveLength(6);
    expect(children?.some((c) => c.data.isPlaceholder)).toBe(true);
    expect(children?.some((c) => !c.data.isPlaceholder)).toBe(true);
  });

  it('should split multiple branches of the same type', () => {
    const entityDef: { routeConfiguration: RouteConfigurationDefinition } = {
      routeConfiguration: {
        intercept: [{ intercept: { id: 'intercept-1' } }, { intercept: { id: 'intercept-2' } }],
      },
    };

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    // One placeholder + 2 intercept nodes for intercept branch, plus 4 placeholders for other branches
    expect(children).toHaveLength(7);

    expect(children?.[0].getPreviousNode()).toBeUndefined();
    expect(children?.[0].getNextNode()).toBeUndefined();
    expect(children?.[1].getPreviousNode()).toBeUndefined();
    expect(children?.[1].getNextNode()).toBeUndefined();
  });

  it('should handle multiple different branch types', () => {
    const entityDef: { routeConfiguration: RouteConfigurationDefinition } = {
      routeConfiguration: {
        intercept: [{ intercept: { id: 'intercept-1' } }],
        onException: [{ onException: { id: 'onException-1' } }],
        onCompletion: [{ onCompletion: { id: 'onCompletion-1' } }],
      },
    };

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    // intercept: 2, onException: 2, onCompletion: 2, interceptFrom: 1, interceptSendToEndpoint: 1
    expect(children).toHaveLength(8);

    children?.forEach((child) => {
      expect(child.getPreviousNode()).toBeUndefined();
      expect(child.getNextNode()).toBeUndefined();
    });
  });

  it('should handle interceptFrom branch type', () => {
    const entityDef: { routeConfiguration: RouteConfigurationDefinition } = {
      routeConfiguration: {
        interceptFrom: [{ interceptFrom: { id: 'interceptFrom-1', uri: 'direct:test' } }],
      },
    };

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    expect(children).toHaveLength(6);
    expect(children?.some((c) => c.data.isPlaceholder)).toBe(true);
    expect(children?.some((c) => !c.data.isPlaceholder)).toBe(true);
  });

  it('should handle interceptSendToEndpoint branch type', () => {
    const entityDef: { routeConfiguration: RouteConfigurationDefinition } = {
      routeConfiguration: {
        interceptSendToEndpoint: [{ interceptSendToEndpoint: { id: 'interceptSend-1', uri: 'mock:test' } }],
      },
    };

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    expect(children).toHaveLength(6);
    expect(children?.some((c) => c.data.isPlaceholder)).toBe(true);
    expect(children?.some((c) => !c.data.isPlaceholder)).toBe(true);
  });

  it('should include placeholder nodes for empty branches', () => {
    const entityDef: { routeConfiguration: RouteConfigurationDefinition } = {
      routeConfiguration: {
        intercept: [{ intercept: { id: 'intercept-1' } }],
      },
    };

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    expect(children?.some((c) => c.data.isPlaceholder)).toBe(true);
    expect(children?.find((c) => !c.data.isPlaceholder)?.getChildren()?.[0].data.isPlaceholder).toBe(true);
  });

  it('should handle all routeConfiguration branch types together', () => {
    const entityDef: { routeConfiguration: RouteConfigurationDefinition } = {
      routeConfiguration: {
        intercept: [{ intercept: { id: 'intercept-1' } }],
        interceptFrom: [{ interceptFrom: { id: 'interceptFrom-1', uri: 'direct:test' } }],
        interceptSendToEndpoint: [{ interceptSendToEndpoint: { id: 'interceptSend-1', uri: 'mock:test' } }],
        onException: [{ onException: { id: 'onException-1' } }],
        onCompletion: [{ onCompletion: { id: 'onCompletion-1' } }],
      },
    };

    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    // One placeholder + one node per branch type = 2*5 = 10
    expect(children).toHaveLength(10);

    children?.forEach((child) => {
      expect(child.getPreviousNode()).toBeUndefined();
      expect(child.getNextNode()).toBeUndefined();
    });
  });
});
