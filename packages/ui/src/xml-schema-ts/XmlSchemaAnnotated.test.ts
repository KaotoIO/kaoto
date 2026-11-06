import { XmlSchemaXPath } from './XmlSchemaXPath';

describe('XmlSchemaAnnotated', () => {
  describe('toString', () => {
    it('should return the class name when id is not set', () => {
      const xpath = new XmlSchemaXPath();

      expect(xpath.toString()).toBe('XmlSchemaXPath');
    });

    it('should return the class name with the id when id is set', () => {
      const xpath = new XmlSchemaXPath();
      xpath.setId('selector1');

      expect(xpath.toString()).toBe('XmlSchemaXPath[id:selector1]');
    });
  });
});
