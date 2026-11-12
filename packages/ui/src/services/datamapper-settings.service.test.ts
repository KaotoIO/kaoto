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
      const settings: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS, omitXmlDeclaration: true };

      const answer = DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.JSON_SCHEMA);

      expect(answer.omitXmlDeclaration).toEqual(DEFAULT_DATAMAPPER_SETTINGS.omitXmlDeclaration);
      expect(settings.omitXmlDeclaration).toBeTruthy();
    });

    it('should keep omitXmlDeclaration for an XML Schema target', () => {
      const settings: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS, omitXmlDeclaration: true };

      const answer = DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.XML_SCHEMA);

      expect(answer).toBe(settings);
    });

    it('should return the same reference when nothing has to be reset', () => {
      const settings: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS, omitXmlDeclaration: false };

      expect(DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.JSON_SCHEMA)).toBe(settings);
      expect(DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.Primitive)).toBe(settings);
    });

    it.each([DocumentDefinitionType.JSON_SCHEMA, DocumentDefinitionType.Primitive])(
      'should reset isOutputValidationEnabled for a %s target',
      (targetDefinitionType) => {
        const settings: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS, isOutputValidationEnabled: true };

        const answer = DataMapperSettingsService.sanitizeForTarget(settings, targetDefinitionType);

        expect(answer.isOutputValidationEnabled).toBe(false);
        expect(settings.isOutputValidationEnabled).toBe(true);
      },
    );

    it('should keep isOutputValidationEnabled for an XML Schema target', () => {
      const settings: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS, isOutputValidationEnabled: true };

      const answer = DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.XML_SCHEMA);

      expect(answer).toBe(settings);
    });

    it('should reset both settings at once when both apply', () => {
      const settings: IDataMapperSettings = {
        ...DEFAULT_DATAMAPPER_SETTINGS,
        omitXmlDeclaration: true,
        isOutputValidationEnabled: true,
      };

      const answer = DataMapperSettingsService.sanitizeForTarget(settings, DocumentDefinitionType.JSON_SCHEMA);

      expect(answer.omitXmlDeclaration).toBe(false);
      expect(answer.isOutputValidationEnabled).toBe(false);
    });
  });

  describe('applyPatch()', () => {
    it('should return the same reference when the patch changes nothing', () => {
      const settings: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS };

      expect(DataMapperSettingsService.applyPatch(settings, { omitXmlDeclaration: false })).toBe(settings);
      expect(DataMapperSettingsService.applyPatch(settings, {})).toBe(settings);
    });

    it('should return a new object when the patch changes a value', () => {
      const settings: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS };

      const answer = DataMapperSettingsService.applyPatch(settings, { isOutputValidationEnabled: true });

      expect(answer).not.toBe(settings);
      expect(answer.isOutputValidationEnabled).toBe(true);
      expect(settings.isOutputValidationEnabled).toBe(false);
    });
  });

  describe('isXslOutputChanged()', () => {
    const base: IDataMapperSettings = { ...DEFAULT_DATAMAPPER_SETTINGS };

    it('should ignore a change of the output validation', () => {
      expect(DataMapperSettingsService.isXslOutputChanged(base, { ...base, isOutputValidationEnabled: true })).toBe(
        false,
      );
    });

    it('should ignore a change of the output variable', () => {
      expect(DataMapperSettingsService.isXslOutputChanged(base, { ...base, outputVariable: 'out' })).toBe(false);
    });

    it('should detect a change of omitXmlDeclaration', () => {
      expect(DataMapperSettingsService.isXslOutputChanged(base, { ...base, omitXmlDeclaration: true })).toBe(true);
    });
  });
});
