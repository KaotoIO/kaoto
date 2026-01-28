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
});
