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

  it('should return placeholder when routeConfiguration is empty', () => {
    const entityDef = { routeConfiguration: {} };
    const vizNode = mapper.getVizNodeFromProcessor(
      path,
      { processorName: 'routeConfiguration' as keyof ProcessorDefinition },
      entityDef,
    );

    const children = vizNode.getChildren();
    expect(children).toHaveLength(1);
    expect(children?.[0].data.isPlaceholder).toBe(true);
    expect(children?.[0].data.name).toBe('placeholder-special-child');
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
    // Should have intercept child, no placeholder
    expect(children?.length).toBeGreaterThan(0);
    expect(children?.some((c) => c.data.isPlaceholder)).toBe(false);
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
    expect(children).toHaveLength(2);

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
    expect(children).toHaveLength(3);

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
    expect(children?.length).toBeGreaterThan(0);
    expect(children?.some((c) => c.data.isPlaceholder)).toBe(false);
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
    expect(children?.length).toBeGreaterThan(0);
    expect(children?.some((c) => c.data.isPlaceholder)).toBe(false);
  });

  it('should filter out placeholder nodes from branches', () => {
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
    // Verify no placeholder nodes exist in children (they should be filtered out)
    const hasPlaceholderPath = children?.some((c) => c.data.path?.endsWith('placeholder'));
    expect(hasPlaceholderPath).toBe(false);
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
    expect(children).toHaveLength(5);

    children?.forEach((child) => {
      expect(child.getPreviousNode()).toBeUndefined();
      expect(child.getNextNode()).toBeUndefined();
      expect(child.data.isPlaceholder).toBeFalsy();
    });
  });
});
