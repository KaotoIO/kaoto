import { XmlParser, isXML } from './xml-parser';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { JSONSchema4 } from 'json-schema';
import { doTryCamelRouteJson, doTryCamelRouteXml } from '../../stubs';

describe('XmlParser', () => {
  let parser: XmlParser;
  let schema: JSONSchema4;

  beforeEach(async () => {
    const cat = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    schema = await import(cat.catalogPath + cat.catalogDefinition.schemas['camelYamlDsl'].file);
    parser = new XmlParser(schema);
  });

  beforeEach(() => {});

  it('parses XML with a single route correctly', () => {
    const xml = `<routes><route><from uri="direct:start" /></route></routes>`;
    const result = parser.parseXML(xml);
    expect(result).toEqual([
      {
        from: { uri: 'direct:start', steps: [] },
      },
    ]);
  });

  it('parses XML with multiple routes correctly', () => {
    const xml = `<routes><route id="test"><from uri="direct:first" /></route><route><from uri="direct:second" /></route></routes>`;
    const result = parser.parseXML(xml);
    expect(result).toEqual([
      { id: 'test', from: { uri: 'direct:first', steps: [] } },
      {
        from: { uri: 'direct:second', steps: [] },
      },
    ]);
  });

  it('returns an empty array for XML with no routes', () => {
    const xml = `<routes></routes>`;
    const result = parser.parseXML(xml);
    expect(result).toEqual([]);
  });

  it('dereferences schema correctly', () => {
    const dSchema = { $ref: '#/items/definitions/org.apache.camel.model.language.ConstantExpression' };
    const result = parser.dereferenceSchema(dSchema);
    expect(result).toEqual(schema.items.definitions['org.apache.camel.model.language.ConstantExpression']);
  });

  it('returns the same schema if no $ref is present', () => {
    const dSchema = { type: 'string' };
    const result = parser.dereferenceSchema(dSchema);
    expect(result).toEqual(dSchema);
  });

  it('identifies valid XML correctly', () => {
    const xml = `<routes><route><from uri="direct:start" /></route></routes>`;
    expect(isXML(xml)).toBe(true);
  });

  it('identifies invalid XML correctly', () => {
    const xml = `not an xml`;
    expect(isXML(xml)).toBe(false);
  });

  it('parses XML with doTry correctly', () => {
    const result = parser.parseXML(doTryCamelRouteXml);
    expect(result).toEqual([doTryCamelRouteJson]);
  });
});
