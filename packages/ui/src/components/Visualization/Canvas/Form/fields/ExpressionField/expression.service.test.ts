import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';

import { DynamicCatalog } from '../../../../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CamelCatalogService, CatalogKind, KaotoSchemaDefinition } from '../../../../../../models';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ExpressionService } from './expression.service';

describe('ExpressionService', () => {
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
          { csimple: { type: 'string' } },
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
              { csimple: { type: 'string' } },
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
                      { csimple: { type: 'string' } },
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
          { csimple: { type: 'string' } },
          { constant: { type: 'string' } },
          { expression: { type: 'string' } },
          { groovy: { type: 'string' } },
        ],
      });
    });
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

  it.each(expressionsArray)('should parse %s', async (parentModel, expected) => {
    const result = await ExpressionService.parseExpressionModel(parentModel);

    expect(result).toEqual(expected);
  });
  describe('updateExpressionFromModel', () => {
    beforeAll(async () => {
      const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
      const languageCatalog = catalogsMap.languageCatalog;
      CamelCatalogService.setCatalogKey(CatalogKind.Language, languageCatalog);
    });

    it('should update the target model expression if supported', async () => {
      const sourceModel = { simple: { expression: 'sourceExpr' } };
      const targetModel = { csimple: { expression: undefined } };

      await ExpressionService.updateExpressionFromModel(sourceModel, targetModel);

      expect(targetModel.csimple.expression).toBe('sourceExpr');
    });

    it('should not update the target model if language does not support expression', async () => {
      const sourceModel = { simple: { expression: 'sourceExpr' } };
      const targetModel = { bean: { expression: undefined } };

      await ExpressionService.updateExpressionFromModel(sourceModel, targetModel);

      expect(targetModel.bean.expression).toBeUndefined();
    });
  });
});
