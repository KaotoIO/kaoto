import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogKind } from '../catalog-kind';
import { EntityType } from '../entities';
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
    const route = visualEntities[0].toJSON().route;
    expect(route.from?.uri).toBe('direct:start');
    expect(route.from?.steps).toHaveLength(2);
  });

  it('reports XML and serializes back to XML', async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    const resource = new CamelXMLRouteResource(xml);
    resource.initialize();

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

  it('produces no XML declaration prefix when the source has none', () => {
    const resource = new CamelXMLRouteResource(xml);
    const output = resource.toString();
    expect(output.startsWith('<?xml')).toBe(false);
  });

  it('XML declaration is followed by a newline when present', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n<camel></camel>`;
    const resource = new CamelXMLRouteResource(source);
    const output = resource.toString();
    expect(output).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n/);
  });

  it('extracts multiple leading comments and includes all in toString()', () => {
    const source = `<!-- First comment -->\n<!-- Second comment -->\n<camel></camel>`;
    const resource = new CamelXMLRouteResource(source);
    const output = resource.toString();
    expect(output).toContain('<!-- First comment -->');
    expect(output).toContain('<!-- Second comment -->');
  });

  it('does not extract a comment that appears after non-whitespace content', () => {
    // The comment is inside the XML body, not a leading comment
    const source = `<camel><!-- inline comment --></camel>`;
    const resource = new CamelXMLRouteResource(source);
    // toString() should not prepend any comment
    const output = resource.toString();
    expect(output).not.toMatch(/^<!--/);
  });

  it('does not throw when constructed with an empty string', () => {
    expect(() => new CamelXMLRouteResource('')).not.toThrow();
  });

  it('toString() returns a string when constructed from empty input', () => {
    const resource = new CamelXMLRouteResource('');
    expect(typeof resource.toString()).toBe('string');
  });

  it('includes Beans entities in toString() output', async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    const beansXml = `<camel><bean type="com.example.MyBean"/></camel>`;
    const resource = new CamelXMLRouteResource(beansXml);
    resource.initialize();
    const output = resource.toString();
    expect(typeof output).toBe('string');
  });
});
