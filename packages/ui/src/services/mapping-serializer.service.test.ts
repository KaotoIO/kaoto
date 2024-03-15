import { MappingSerializerService, NS_XSL } from './mapping-serializer.service';

describe('MappingSerializerService', () => {
  it('createNew() should create am empty XSLT document', () => {
    const xslt = MappingSerializerService.createNew();
    const stylesheet = xslt.getElementsByTagNameNS(NS_XSL, 'stylesheet');
    expect(stylesheet.length).toEqual(1);
    expect(stylesheet[0].namespaceURI).toBe(NS_XSL);
    expect(stylesheet[0].localName).toBe('stylesheet');
    const template = xslt.getElementsByTagNameNS(NS_XSL, 'template');
    expect(template.length).toEqual(1);
    expect(template[0].namespaceURI).toBe(NS_XSL);
    expect(template[0].localName).toBe('template');
  });

  describe('serialize()', () => {
    it('should serialize the mappings into a XSLT document', () => {
      const empty = MappingSerializerService.serialize([]);
      expect(empty).toBeDefined();
    });
  });
});
