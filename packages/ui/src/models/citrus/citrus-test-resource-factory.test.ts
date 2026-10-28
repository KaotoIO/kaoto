import { citrusTestYaml } from '../../stubs/citrus-test';
import { SourceSchemaType } from '../camel';
import { CitrusTestResource } from './citrus-test-resource';
import { CitrusTestResourceFactory } from './citrus-test-resource-factory';
import { CitrusXMLTestResource } from './citrus-xml-test-resource';

describe('CitrusTestResourceFactory', () => {
  describe('createCitrusTestResource', () => {
    it('should create from YAML source with Test type', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource(citrusTestYaml, SourceSchemaType.Test);
      expect(resource).toBeInstanceOf(CitrusTestResource);
    });

    it('should handle undefined source', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource();
      expect(resource).toBeUndefined();
    });

    it('should handle other schema types', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource('', SourceSchemaType.RouteYaml);
      expect(resource).toBeUndefined();
    });

    it('should handle undefined source object with Test type', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource(undefined, SourceSchemaType.Test);
      expect(resource).toBeInstanceOf(CitrusTestResource);
    });

    it('should create CitrusXMLTestResource for TestXml type', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t"><actions/></test>`;
      const resource = CitrusTestResourceFactory.getCitrusTestResource(xml, SourceSchemaType.TestXml);
      expect(resource).toBeInstanceOf(CitrusXMLTestResource);
    });

    it('should create CitrusXMLTestResource for empty source with TestXml type', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource('', SourceSchemaType.TestXml);
      expect(resource).toBeInstanceOf(CitrusXMLTestResource);
    });

    it('should not create a Citrus resource from XML source without Citrus namespace', () => {
      const xml = `<test name="t"><actions/></test>`;
      const resource = CitrusTestResourceFactory.getCitrusTestResource(xml);
      expect(resource).toBeUndefined();
    });

    it('should auto-detect Citrus XML by namespace when no type is specified', () => {
      const xml = `<test xmlns="http://citrusframework.org/schema/xml/testcase" name="t"><actions/></test>`;
      const resource = CitrusTestResourceFactory.getCitrusTestResource(xml);
      expect(resource).toBeInstanceOf(CitrusXMLTestResource);
    });

    it('should auto-detect YAML source with actions array', () => {
      const resource = CitrusTestResourceFactory.getCitrusTestResource(citrusTestYaml);
      expect(resource).toBeInstanceOf(CitrusTestResource);
    });
  });
});
