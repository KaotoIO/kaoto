import { DocumentType } from '../../../../models/datamapper/document';
import { DataMapperStepService } from '../../../../services/datamapper-step.service';
import {
  createSchemaFileItems,
  getFileExtension,
  getFileName,
  isJsonExtension,
  isXmlExtension,
  validateFileExtension,
  validateNoMixedTypes,
} from './utils';

describe('utils', () => {
  describe('getFileExtension', () => {
    it('should extract extension from a file path', () => {
      expect(getFileExtension('file.xsd')).toBe('.xsd');
      expect(getFileExtension('path/to/file.json')).toBe('.json');
      expect(getFileExtension('FILE.XSD')).toBe('.xsd');
    });

    it('should handle files with multiple dots', () => {
      expect(getFileExtension('my.schema.json')).toBe('.json');
    });
  });

  describe('getFileName', () => {
    it('should extract filename from a path', () => {
      expect(getFileName('path/to/file.xsd')).toBe('file.xsd');
      expect(getFileName('file.xsd')).toBe('file.xsd');
    });

    it('should handle paths with multiple segments', () => {
      expect(getFileName('a/b/c/d.json')).toBe('d.json');
    });
  });

  describe('isXmlExtension', () => {
    it('should return true for XML extensions', () => {
      expect(isXmlExtension('.xsd')).toBe(true);
      expect(isXmlExtension('.xml')).toBe(true);
    });

    it('should return false for non-XML extensions', () => {
      expect(isXmlExtension('.json')).toBe(false);
      expect(isXmlExtension('.txt')).toBe(false);
    });
  });

  describe('isJsonExtension', () => {
    it('should return true for JSON extensions', () => {
      expect(isJsonExtension('.json')).toBe(true);
    });

    it('should return false for non-JSON extensions', () => {
      expect(isJsonExtension('.xsd')).toBe(false);
      expect(isJsonExtension('.txt')).toBe(false);
    });
  });

  describe('validateFileExtension', () => {
    it('should return undefined for valid XML extension on SOURCE_BODY', () => {
      expect(validateFileExtension('.xsd', DocumentType.SOURCE_BODY)).toBeUndefined();
    });

    it('should return error for JSON on SOURCE_BODY when not supported', () => {
      jest.spyOn(DataMapperStepService, 'supportsJsonBody').mockReturnValue(false);
      const result = validateFileExtension('.json', DocumentType.SOURCE_BODY);
      expect(result).toContain('JSON source body is not supported');
    });

    it('should return undefined for JSON on SOURCE_BODY when supported', () => {
      jest.spyOn(DataMapperStepService, 'supportsJsonBody').mockReturnValue(true);
      expect(validateFileExtension('.json', DocumentType.SOURCE_BODY)).toBeUndefined();
    });

    it('should return error for unknown extension on SOURCE_BODY', () => {
      const result = validateFileExtension('.txt', DocumentType.SOURCE_BODY);
      expect(result).toContain("Unknown file extension '.txt'");
      expect(result).toContain('Only XML schema file');
    });

    it('should return undefined for valid extensions on TARGET_BODY', () => {
      expect(validateFileExtension('.xsd', DocumentType.TARGET_BODY)).toBeUndefined();
      expect(validateFileExtension('.json', DocumentType.TARGET_BODY)).toBeUndefined();
    });

    it('should return error for unknown extension on TARGET_BODY', () => {
      const result = validateFileExtension('.txt', DocumentType.TARGET_BODY);
      expect(result).toContain("Unknown file extension '.txt'");
      expect(result).toContain('Either XML schema');
    });
  });

  describe('validateNoMixedTypes', () => {
    it('should return undefined for empty existing file list', () => {
      expect(validateNoMixedTypes('.xsd', [])).toBeUndefined();
    });

    it('should return undefined when types match (both XML)', () => {
      expect(validateNoMixedTypes('.xsd', ['existing.xsd'])).toBeUndefined();
    });

    it('should return undefined when types match (both JSON)', () => {
      expect(validateNoMixedTypes('.json', ['existing.json'])).toBeUndefined();
    });

    it('should return error when mixing XML and JSON', () => {
      const result = validateNoMixedTypes('.json', ['existing.xsd']);
      expect(result).toContain('Cannot mix schema types');
    });

    it('should return error when mixing JSON and XML', () => {
      const result = validateNoMixedTypes('.xsd', ['existing.json']);
      expect(result).toContain('Cannot mix schema types');
    });
  });

  describe('createSchemaFileItems', () => {
    it('should return empty array for null result', () => {
      expect(createSchemaFileItems(null, ['file.xsd'])).toEqual([]);
    });

    it('should create success items for files without errors or warnings', () => {
      const result = createSchemaFileItems({ validationStatus: 'success' }, ['file.xsd']);
      expect(result).toEqual([{ filePath: 'file.xsd', status: 'success', messages: [] }]);
    });

    it('should create error items for files with errors', () => {
      const result = createSchemaFileItems(
        {
          validationStatus: 'error',
          errors: [{ filePath: 'file.xsd', message: 'Parse error' }],
        },
        ['file.xsd'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('error');
      expect(result[0].messages).toContain('Parse error');
    });

    it('should create warning items for files with warnings only', () => {
      const result = createSchemaFileItems(
        {
          validationStatus: 'warning',
          warnings: [{ filePath: 'file.xsd', message: 'Missing import' }],
        },
        ['file.xsd'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('warning');
      expect(result[0].messages).toContain('Missing import');
    });

    it('should include global errors without filePath', () => {
      const result = createSchemaFileItems(
        {
          validationStatus: 'error',
          errors: [{ message: 'Global error' }],
        },
        ['file.xsd'],
      );
      expect(result).toHaveLength(2);
      const globalItem = result.find((item) => !item.filePath);
      expect(globalItem).toBeDefined();
      expect(globalItem!.status).toBe('error');
      expect(globalItem!.messages).toContain('Global error');
    });

    it('should include global warnings without filePath', () => {
      const result = createSchemaFileItems(
        {
          validationStatus: 'warning',
          warnings: [{ message: 'Global warning' }],
        },
        ['file.xsd'],
      );
      const globalItem = result.find((item) => !item.filePath);
      expect(globalItem).toBeDefined();
      expect(globalItem!.status).toBe('warning');
      expect(globalItem!.messages).toContain('Global warning');
    });

    it('should sort items by status: error first, then warning, then success', () => {
      const result = createSchemaFileItems(
        {
          validationStatus: 'warning',
          errors: [{ filePath: 'b.xsd', message: 'Error in b' }],
          warnings: [{ filePath: 'c.xsd', message: 'Warning in c' }],
        },
        ['a.xsd', 'b.xsd', 'c.xsd'],
      );
      expect(result[0].status).toBe('error');
      expect(result[1].status).toBe('warning');
      expect(result[2].status).toBe('success');
    });

    it('should combine errors and warnings for the same file', () => {
      const result = createSchemaFileItems(
        {
          validationStatus: 'error',
          errors: [{ filePath: 'file.xsd', message: 'Error msg' }],
          warnings: [{ filePath: 'file.xsd', message: 'Warning msg' }],
        },
        ['file.xsd'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('error');
      expect(result[0].messages).toContain('Error msg');
      expect(result[0].messages).toContain('Warning msg');
    });

    it('should match files by filename when filePath in report uses filename only', () => {
      const result = createSchemaFileItems(
        {
          validationStatus: 'error',
          errors: [{ filePath: 'file.xsd', message: 'Error msg' }],
        },
        ['path/to/file.xsd'],
      );
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('error');
    });
  });
});
