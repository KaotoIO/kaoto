import { ExpressionService } from './expression.service';
import * as yamlDslSchema from '@kaoto-next/camel-catalog/camelYamlDsl.json';
import * as languageCatalog from '@kaoto-next/camel-catalog/camel-catalog-aggregate-languages.json';
import { CatalogKind, ICamelLanguageDefinition } from '../../../models';
import { CamelCatalogService } from '../../../models/visualization/flows';

describe('ExpressionService', () => {
  beforeAll(() => {
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (yamlDslSchema as any).default;
    delete (languageCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Language,
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
    );
  });

  describe('getLanguageMap', () => {
    it('should return language map', () => {
      const languageMap = ExpressionService.getLanguageMap();
      expect(languageMap.simple.language.title).toEqual('Simple');
      expect(languageMap.jq.language.name).toEqual('jq');
      expect(languageMap.file).toBeUndefined();
      expect(languageMap.language.language.description).toContain('custom');
      expect(languageMap.language.properties.language.displayName).toEqual('Language');
    });
  });

  describe('getLanguageSchema', () => {
    it('should return language schema', () => {
      const languageMap = ExpressionService.getLanguageMap();
      const jsonpathSchema = ExpressionService.getLanguageSchema(languageMap.jsonpath);
      expect(jsonpathSchema.properties.suppressExceptions.type).toBe('boolean');
      const customSchema = ExpressionService.getLanguageSchema(languageMap.language);
      expect(customSchema.properties.language.type).toBe('string');
    });
  });

  describe('parseExpressionModel', () => {
    let languageMap: Record<string, ICamelLanguageDefinition>;
    beforeAll(() => {
      languageMap = ExpressionService.getLanguageMap();
    });

    it('should parse #1', () => {
      const { language, model } = ExpressionService.parseExpressionModel(languageMap, { simple: '${body}' });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should parse #2', () => {
      const { language, model } = ExpressionService.parseExpressionModel(languageMap, {
        simple: { expression: '${body}' },
      });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should parse #3', () => {
      const { language, model } = ExpressionService.parseExpressionModel(languageMap, {
        expression: {
          simple: '${body}',
        },
      });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should parse #4', () => {
      const { language, model } = ExpressionService.parseExpressionModel(languageMap, {
        expression: {
          simple: { expression: '${body}' },
        },
      });
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({ expression: '${body}' });
    });

    it('should return simple and empty model if model is empty', () => {
      const { language, model } = ExpressionService.parseExpressionModel(languageMap, {});
      expect(language).toEqual(languageMap.simple);
      expect(model).toEqual({});
    });

    it('should return simple and empty model if language map and model is empty', () => {
      const { language, model } = ExpressionService.parseExpressionModel({}, {});
      expect(language).toBeUndefined();
      expect(model).toEqual({});
    });
  });

  describe('setExpressionModel', () => {
    let languageMap: Record<string, ICamelLanguageDefinition>;
    beforeAll(() => {
      languageMap = ExpressionService.getLanguageMap();
    });

    it('should write expression', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = {};
      ExpressionService.setExpressionModel(languageMap, parentModel, 'simple', { expression: '${body}' });
      expect(parentModel.expression.simple.expression).toEqual('${body}');
    });

    it('should write expression and remove existing', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = { constant: 'foo' };
      ExpressionService.setExpressionModel(languageMap, parentModel, 'simple', {
        expression: '${body}',
        resultType: 'string',
      });
      expect(parentModel.constant).toBeUndefined();
      expect(parentModel.expression.simple.expression).toEqual('${body}');
      expect(parentModel.expression.simple.resultType).toEqual('string');
    });

    it('should not write if empty', () => {
      const parentModel: any = {};
      ExpressionService.setExpressionModel(languageMap, parentModel, '', {});
      expect(parentModel.expression.simple).toBeUndefined();
    });
  });
});
