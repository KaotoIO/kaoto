import { DEFAULT_DATAMAPPER_SETTINGS, DocumentDefinitionType, IDataMapperSettings } from '../models/datamapper';
import { DataMapperSettingsService } from './datamapper-settings.service';

describe('DataMapperSettingsService', () => {
  describe('isOmitXmlDeclarationSupported()', () => {
    it('should support an XML Schema target', () => {
      expect(DataMapperSettingsService.isOmitXmlDeclarationSupported(DocumentDefinitionType.XML_SCHEMA)).toBeTruthy();
    });

    it('should not support a JSON Schema target', () => {
      expect(DataMapperSettingsService.isOmitXmlDeclarationSupported(DocumentDefinitionType.JSON_SCHEMA)).toBeFalsy();
    });

    it('should not support a primitive target', () => {
      expect(DataMapperSettingsService.isOmitXmlDeclarationSupported(DocumentDefinitionType.Primitive)).toBeFalsy();
    });
  });

  describe('sanitizeForTarget()', () => {
    it('should reset omitXmlDeclaration for a non-XML target', () => {
      const settings: IDataMapperSettings = { omitXmlDeclaration: true };

      const answer = DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.JSON_SCHEMA);

      expect(answer.omitXmlDeclaration).toEqual(DEFAULT_DATAMAPPER_SETTINGS.omitXmlDeclaration);
      expect(settings.omitXmlDeclaration).toBeTruthy();
    });

    it('should keep omitXmlDeclaration for an XML Schema target', () => {
      const settings: IDataMapperSettings = { omitXmlDeclaration: true };

      const answer = DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.XML_SCHEMA);

      expect(answer).toBe(settings);
    });

    it('should return the same reference when nothing has to be reset', () => {
      const settings: IDataMapperSettings = { omitXmlDeclaration: false };

      expect(DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.JSON_SCHEMA)).toBe(settings);
      expect(DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.Primitive)).toBe(settings);
    });
  });
});
