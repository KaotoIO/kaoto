import { XmlSchemaAnnotated } from './XmlSchemaAnnotated';

describe('XmlSchemaAnnotated', () => {
  describe('toString', () => {
    it('should return the type name when id is not set', () => {
      const annotated = new XmlSchemaAnnotated();

      expect(annotated.toString()).toBe('XmlSchemaAnnotated');
    });

    it('should return the type name with the id when id is set', () => {
      const annotated = new XmlSchemaAnnotated();
      annotated.setId('selector1');

      expect(annotated.toString()).toBe('XmlSchemaAnnotated[id:selector1]');
    });

    describe('when class names are mangled by production minification', () => {
      it('should not depend on a renamed constructor name', () => {
        class Wh extends XmlSchemaAnnotated {}
        const annotated = new Wh();
        annotated.setId('selector1');

        expect(annotated.constructor.name).toBe('Wh');
        expect(annotated.toString()).toBe('XmlSchemaAnnotated[id:selector1]');
      });

      it('should not depend on an empty constructor name', () => {
        const createAnonymousClass = () => class extends XmlSchemaAnnotated {};
        const annotated = new (createAnonymousClass())();
        annotated.setId('selector1');

        expect(annotated.constructor.name).toBe('');
        expect(annotated.toString()).toBe('XmlSchemaAnnotated[id:selector1]');
      });
    });
  });
});
