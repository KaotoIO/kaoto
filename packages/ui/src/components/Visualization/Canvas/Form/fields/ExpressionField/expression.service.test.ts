import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalog } from '../../../../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, KaotoSchemaDefinition } from '../../../../../../models';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ExpressionService } from './expression.service';

describe('ExpressionService', () => {
  let languageNames: string[];

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    const languageCatalog = catalogsMap.languageCatalog;

    // Set up DynamicCatalogRegistry with a catalog backed by the language catalog map
    const mockProvider = {
      id: 'language-mock',
      fetch: async (key: string) => languageCatalog[key],
      fetchAll: async () => languageCatalog,
    };
    DynamicCatalogRegistry.get().setCatalog(CatalogKind.Language, new DynamicCatalog(mockProvider));

    languageNames = await ExpressionService.getLanguageNames();
  });

  describe('getExpressionsSchema', () => {
    it('should return an empty object if the schema is not an expression', () => {
      const schema = {};

      const result = ExpressionService.getExpressionsSchema(schema);

      expect(result).toEqual({});
    });

    it('should return an empty schema if there is no expression oneOf', () => {
      const schema: KaotoSchemaDefinition['schema'] = {
        anyOf: [{ oneOf: [{ type: 'string' }] }],
      };

      const result = ExpressionService.getExpressionsSchema(schema);

      expect(result).toEqual({});
    });

    it('should return the schema if the oneOf is an expression', () => {
      const schema: KaotoSchemaDefinition['schema'] = {
        oneOf: [
          { simple: { type: 'string' } },
          { constant: { type: 'string' } },
          { expression: { type: 'string' } },
          { groovy: { type: 'string' } },
        ],
      };

      const result = ExpressionService.getExpressionsSchema(schema);

      expect(result).toEqual(schema);
    });

    it('should return the schema from a nested oneOf is an expression', () => {
      const schema: KaotoSchemaDefinition['schema'] = {
        anyOf: [
          {
            oneOf: [
              { simple: { type: 'string' } },
              { constant: { type: 'string' } },
              { expression: { type: 'string' } },
              { groovy: { type: 'string' } },
            ],
          },
        ],
      };

      const result = ExpressionService.getExpressionsSchema(schema);

      expect(result).toEqual(schema.anyOf![0]);
    });

    it('should return the schema from two levels nested oneOf is an expression', () => {
      const schema: KaotoSchemaDefinition['schema'] = {
        anyOf: [
          {
            oneOf: [
              {
                anyOf: [
                  {
                    oneOf: [
                      { simple: { type: 'string' } },
                      { constant: { type: 'string' } },
                      { expression: { type: 'string' } },
                      { groovy: { type: 'string' } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = ExpressionService.getExpressionsSchema(schema);

      expect(result).toEqual({
        oneOf: [
          { simple: { type: 'string' } },
          { constant: { type: 'string' } },
          { expression: { type: 'string' } },
          { groovy: { type: 'string' } },
        ],
      });
    });
  });

  describe('getLanguageNames', () => {
    it('should return a non-empty list of language names from the catalog', async () => {
      const result = await ExpressionService.getLanguageNames();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include known language names such as simple and constant', async () => {
      const result = await ExpressionService.getLanguageNames();

      expect(result).toContain('simple');
      expect(result).toContain('constant');
    });
  });

  describe('parseExpressionModel', () => {
    it('should return undefined when parentModel is undefined', () => {
      const result = ExpressionService.parseExpressionModel(languageNames, undefined);

      expect(result).toBeUndefined();
    });

    const expressionsArray: [Record<string, unknown>, Record<string, unknown>][] = [
      [
        {
          name: 'MY_HEADER',
          expression: {
            simple: {
              expression: '${body}',
              trim: true,
            },
          },
        },
        {
          name: 'MY_HEADER',
          simple: {
            expression: '${body}',
            trim: true,
          },
        },
      ],
      [
        {
          name: 'MY_HEADER',
          expression: {
            simple: '${body}',
          },
        },
        {
          name: 'MY_HEADER',
          simple: {
            expression: '${body}',
          },
        },
      ],
      [
        {
          name: 'MY_HEADER',
          simple: {
            id: 'simple',
            expression: '${body}',
          },
        },
        {
          name: 'MY_HEADER',
          simple: {
            id: 'simple',
            expression: '${body}',
          },
        },
      ],
      [
        {
          name: 'MY_HEADER',
          simple: '${body}',
        },
        {
          name: 'MY_HEADER',
          simple: {
            expression: '${body}',
          },
        },
      ],
      [
        {
          simple: {
            expression: '${body}',
            trim: true,
          },
        },
        {
          simple: {
            expression: '${body}',
            trim: true,
          },
        },
      ],
      [
        { simple: '${body}' },
        {
          simple: {
            expression: '${body}',
          },
        },
      ],
    ];

    it.each(expressionsArray)('should parse %s', (parentModel, expected) => {
      const result = ExpressionService.parseExpressionModel(languageNames, parentModel);

      expect(result).toEqual(expected);
    });
  });

  describe('updateExpressionFromModel', () => {
    it('should update the target model expression if supported', async () => {
      const sourceModel = { simple: { expression: 'sourceExpr' } };
      const targetModel = { constant: { expression: undefined } };

      await ExpressionService.updateExpressionFromModel(sourceModel, targetModel, languageNames);

      expect(targetModel.constant.expression).toBe('sourceExpr');
    });

    it('should not update the target model if language does not support expression', async () => {
      const sourceModel = { simple: { expression: 'sourceExpr' } };
      const targetModel = { bean: { expression: undefined } };

      await ExpressionService.updateExpressionFromModel(sourceModel, targetModel, languageNames);

      expect(targetModel.bean.expression).toBeUndefined();
    });

    it('should do nothing if sourceModel is undefined', async () => {
      const targetModel = { csimple: { expression: undefined } };

      await ExpressionService.updateExpressionFromModel(undefined, targetModel, languageNames);

      expect(targetModel.csimple.expression).toBeUndefined();
    });
  });
});
