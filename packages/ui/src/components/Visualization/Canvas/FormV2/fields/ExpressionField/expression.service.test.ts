import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { ExpressionService } from './expression.service';

describe('ExpressionService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    const languageCatalog = catalogsMap.languageCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Language, languageCatalog);
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
    const result = ExpressionService.parseExpressionModel(parentModel);

    expect(result).toEqual(expected);
  });
});
