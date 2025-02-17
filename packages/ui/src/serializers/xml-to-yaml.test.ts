import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { getFirstCatalogMap } from '../stubs/test-load-catalog';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../models';
import fs from 'fs';
import path from 'path';
import { YamlCamelResourceSerializer } from './yaml-camel-resource-serializer';
import { KaotoXmlParser } from './xml/kaoto-xml-parser';

describe('XmlParser - XML to YAML comparison', () => {
  let parser: KaotoXmlParser;
  let yamlSerializer: YamlCamelResourceSerializer;
  const xmlDir = path.join(__dirname, '../stubs/xml');
  const yamlDir = path.join(__dirname, '../stubs/yaml');
  const xmlFiles = fs.readdirSync(xmlDir).filter((file) => file.endsWith('.xml'));

  beforeAll(async () => {
    parser = new KaotoXmlParser();
    yamlSerializer = new YamlCamelResourceSerializer();
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
  });

  it.each(xmlFiles)('parses and compares %s correctly', (xmlFile) => {
    const xmlFilePath = path.join(xmlDir, xmlFile);
    const yamlFilePath = path.join(yamlDir, xmlFile.replace('.xml', '.yaml'));

    const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');
    const expectedYamlContent = fs.readFileSync(yamlFilePath, 'utf-8');
    const expectedYaml = yamlSerializer.parse(expectedYamlContent);
    const result = parser.parseXML(xmlContent);

    expect(result).toEqual(expectedYaml);
  });
});
