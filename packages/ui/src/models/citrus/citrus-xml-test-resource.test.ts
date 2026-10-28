import { SourceSchemaType } from '../camel';
import { CitrusTestResource } from './citrus-test-resource';
import { CitrusXMLTestResource } from './citrus-xml-test-resource';

const CITRUS_XML_SOURCE = `<?xml version="1.0" encoding="UTF-8"?>
<test xmlns="http://citrusframework.org/schema/xml/testcase" name="sample-test">
  <actions>
    <print>
      <message>Hello from Citrus!</message>
    </print>
  </actions>
</test>`;

describe('CitrusXMLTestResource', () => {
  it('should return TestXml type', async () => {
    const resource = new CitrusXMLTestResource(CITRUS_XML_SOURCE);
    await resource.initialize();
    expect(resource.getType()).toBe(SourceSchemaType.TestXml);
  });

  it('should be an instance of CitrusTestResource', () => {
    const resource = new CitrusXMLTestResource(CITRUS_XML_SOURCE);
    expect(resource).toBeInstanceOf(CitrusTestResource);
  });

  it('should parse XML source and create visual entities', async () => {
    const resource = new CitrusXMLTestResource(CITRUS_XML_SOURCE);
    await resource.initialize();

    expect(resource.getVisualEntities()).toHaveLength(1);
    const entity = resource.getVisualEntities()[0];
    expect(entity.test.name).toBe('sample-test');
    expect(entity.test.actions).toHaveLength(1);
  });

  it('should handle empty source', async () => {
    const resource = new CitrusXMLTestResource('');
    await resource.initialize();
    expect(resource.getVisualEntities()).toHaveLength(0);
  });

  it('should serialize back to XML', async () => {
    const resource = new CitrusXMLTestResource(CITRUS_XML_SOURCE);
    await resource.initialize();

    const output = await resource.toSourceCode();
    expect(output).toContain('<?xml');
    expect(output).toContain('<test');
    expect(output).toContain('name="sample-test"');
    expect(output).toContain('<print>');
    expect(output).toContain('<message>Hello from Citrus!</message>');
    expect(output).toContain('</test>');
  });

  it('should preserve XML declaration', async () => {
    const resource = new CitrusXMLTestResource(CITRUS_XML_SOURCE);
    await resource.initialize();

    const output = await resource.toSourceCode();
    expect(output).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it('should parse test with variables and createVariables action', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<test xmlns="http://citrusframework.org/schema/xml/testcase" name="vars-test">
  <variables>
    <variable name="user" value="Citrus"/>
  </variables>
  <actions>
    <create-variables>
      <variable name="host" value="localhost"/>
    </create-variables>
    <print>
      <message>Hello \${user}!</message>
    </print>
  </actions>
</test>`;

    const resource = new CitrusXMLTestResource(xml);
    await resource.initialize();

    expect(resource.getVisualEntities()).toHaveLength(1);
    const entity = resource.getVisualEntities()[0];
    expect(entity.test.variables).toHaveLength(1);
    expect(entity.test.variables![0]).toEqual({ name: 'user', value: 'Citrus' });
    expect(entity.test.actions).toHaveLength(2);
  });

  it('should support Citrus runtimes', async () => {
    const resource = new CitrusXMLTestResource();
    await resource.initialize();
    expect(resource.getCompatibleRuntimes()).toEqual(['Citrus']);
  });

  it('should not support multiple visual entities', async () => {
    const resource = new CitrusXMLTestResource();
    await resource.initialize();
    expect(resource.supportsMultipleVisualEntities()).toBe(false);
  });

  it('should create a new entity from XML template via addNewEntity', async () => {
    const resource = new CitrusXMLTestResource('');
    await resource.initialize();
    expect(resource.getVisualEntities()).toHaveLength(0);

    resource.addNewEntity();
    expect(resource.getVisualEntities()).toHaveLength(1);
    expect(resource.getVisualEntities()[0].test.actions.length).toBeGreaterThan(0);
  });
});
