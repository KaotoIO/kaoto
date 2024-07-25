import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { ExpressionService } from './expression.service';

describe('ExpressionService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    const languageCatalog = catalogsMap.languageCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Language, languageCatalog);
  });

  describe('getLanguageMap', () => {
    it('should return language map', () => {
      const languageMap = ExpressionService.getLanguageMap();
      expect(languageMap.simple.model.title).toEqual('Simple');
      expect(languageMap.jq.model.name).toEqual('jq');
      expect(languageMap.file).toBeUndefined();
      expect(languageMap.language.model.description).toContain('custom');
      expect(languageMap.language.properties.language.displayName).toEqual('Language');
    });
  });

  describe('getLanguageSchema', () => {
    it('should return language schema', () => {
      const languageMap = ExpressionService.getLanguageMap();
      const jsonpathSchema = ExpressionService.getLanguageSchema(languageMap.jsonpath);
      expect(jsonpathSchema.properties!.suppressExceptions.type).toBe('boolean');
      const customSchema = ExpressionService.getLanguageSchema(languageMap.language);
      expect(customSchema.properties!.language.type).toBe('string');
    });
  });

  describe('parseStepExpressionModel', () => {
    let languageMap: Record<string, ICamelLanguageDefinition>;
    beforeAll(() => {
      languageMap = ExpressionService.getLanguageMap();
    });

    it('should parse #1', () => {
      const { language, model } = ExpressionService.parseStepExpressionModel(languageMap, { simple: '${body}' });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should parse #2', () => {
      const { language, model } = ExpressionService.parseStepExpressionModel(languageMap, {
        simple: { expression: '${body}' },
      });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should parse #3', () => {
      const { language, model } = ExpressionService.parseStepExpressionModel(languageMap, {
        expression: {
          simple: '${body}',
        },
      });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should parse #4', () => {
      const { language, model } = ExpressionService.parseStepExpressionModel(languageMap, {
        expression: {
          simple: { expression: '${body}' },
        },
      });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should return undefined if model is empty', () => {
      const { language, model } = ExpressionService.parseStepExpressionModel(languageMap, {});
      expect(language).toBeUndefined();
      expect(model).toBeUndefined();
    });

    it('should return undefined if language map and model is empty', () => {
      const { language, model } = ExpressionService.parseStepExpressionModel({}, {});
      expect(language).toBeUndefined();
      expect(model).toBeUndefined();
    });

    it('should parse number constant', () => {
      const { language, model } = ExpressionService.parseStepExpressionModel(languageMap, {
        constant: 123,
      });
      expect(language).toEqual(languageMap.constant);
      expect(model).toEqual({ expression: 123 });
    });
  });

  describe('setStepExpressionModel', () => {
    let languageMap: Record<string, ICamelLanguageDefinition>;
    beforeAll(() => {
      languageMap = ExpressionService.getLanguageMap();
    });

    it('should write expression', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = {};
      ExpressionService.setStepExpressionModel(languageMap, parentModel, 'simple', { expression: '${body}' });
      expect(parentModel.expression.simple.expression).toEqual('${body}');
    });

    it('should write expression and remove existing', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = { constant: 'foo' };
      ExpressionService.setStepExpressionModel(languageMap, parentModel, 'simple', {
        expression: '${body}',
        resultType: 'string',
      });
      expect(parentModel.constant).toBeUndefined();
      expect(parentModel.expression.simple.expression).toEqual('${body}');
      expect(parentModel.expression.simple.resultType).toEqual('string');
    });

    it('should not write if empty', () => {
      const parentModel: any = {};
      ExpressionService.setStepExpressionModel(languageMap, parentModel, '', {});
      expect(parentModel.expression).toBeUndefined();
    });
  });

  describe('parsePropertyExpressionModel', () => {
    let languageMap: Record<string, ICamelLanguageDefinition>;
    beforeAll(() => {
      languageMap = ExpressionService.getLanguageMap();
    });

    it('should parse short', () => {
      const parentModel: any = { simple: '${body}' };
      const { language, model } = ExpressionService.parsePropertyExpressionModel(languageMap, parentModel);
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should parse full', () => {
      const parentModel: any = { simple: { expression: '${body}' } };
      const { language, model } = ExpressionService.parsePropertyExpressionModel(languageMap, parentModel);
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should return undefined if model is empty', () => {
      const { language, model } = ExpressionService.parsePropertyExpressionModel(languageMap, {});
      expect(language).toBeUndefined();
      expect(model).toBeUndefined();
    });
  });

  describe('setPropertyExpressionModel', () => {
    let languageMap: Record<string, ICamelLanguageDefinition>;
    beforeAll(() => {
      languageMap = ExpressionService.getLanguageMap();
    });

    it('should write expression', () => {
      const parentModel: any = {};
      ExpressionService.setPropertyExpressionModel(languageMap, parentModel, 'simple', { expression: '${body}' });
      expect(parentModel.simple.expression).toEqual('${body}');
    });

    it('should write expression and remove existing', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = { constant: 'foo' };
      ExpressionService.setPropertyExpressionModel(languageMap, parentModel, 'simple', {
        expression: '${body}',
        resultType: 'string',
      });
      expect(parentModel.constant).toBeUndefined();
      expect(parentModel.simple.expression).toEqual('${body}');
      expect(parentModel.simple.resultType).toEqual('string');
    });

    it('should not write if empty', () => {
      const parentModel: any = {};
      ExpressionService.setPropertyExpressionModel(languageMap, parentModel, '', {});
      expect(parentModel.simple).toBeUndefined();
    });
  });
});
