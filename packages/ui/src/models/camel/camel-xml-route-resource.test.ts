import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogKind } from '../catalog-kind';
import { EntityType } from '../entities';
import { SerializerType } from '../kaoto-resource';
import { CamelCatalogService } from '../visualization/flows';
import { CamelXMLRouteResource } from './camel-xml-route-resource';

describe('CamelXMLRouteResource', () => {
  const xml = `<camel><routes><route><from uri="direct:start"/><log message="hi"/><to uri="mock:result"/></route></routes></camel>`;

  it('defers catalog-dependent parsing to initialize() so steps survive a cold catalog', async () => {
    CamelCatalogService.clearCatalogs(); // boot state: empty catalog at construction time
    const resource = new CamelXMLRouteResource(xml);

    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);

    resource.initialize();

    const visualEntities = resource.getVisualEntities();
    expect(visualEntities).toHaveLength(1);
    const route = (visualEntities[0].toJSON() as { route: RouteDefinition }).route;
    expect(route.from?.uri).toBe('direct:start');
    expect(route.from?.steps).toHaveLength(2);
  });

  it('reports XML and serializes back to XML', async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    const resource = new CamelXMLRouteResource(xml);
    resource.initialize();

    expect(resource.getSerializerType()).toBe(SerializerType.XML);
    expect(resource.toString()).toContain('<route');
    expect(resource.toString()).toContain('uri="direct:start"');
  });

  it('excludes YAML-only entities from the canvas list', () => {
    const resource = new CamelXMLRouteResource(xml);
    const names = resource.supportedEntities.map((e) => e.type);
    expect(names).toContain(EntityType.Route);
    expect(names).not.toContain(EntityType.OnException);
    expect(names).not.toContain(EntityType.Intercept);
  });

  it('extracts leading comments, the XML declaration, and root element definitions on construction', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Comment 1 -->\n<camel xmlns="http://camel.apache.org/schema/spring"></camel>`;
    const resource = new CamelXMLRouteResource(source);
    expect(resource.toString()).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(resource.toString()).toContain('<!-- Comment 1 -->');
    expect(resource.toString()).toContain('xmlns="http://camel.apache.org/schema/spring"');
  });
});
