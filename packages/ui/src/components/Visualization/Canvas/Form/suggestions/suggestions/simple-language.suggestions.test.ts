import { CatalogLibrary } from '@kaoto/camel-catalog/catalog-index.d.ts';
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { simpleLanguageSuggestionProvider } from './simple-language.suggestions';

describe('Properties Suggestions', () => {
  it.each([
    { propertyName: 'simple.expression', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message', schema: { type: 'string' }, expected: true },
    { propertyName: 'test', schema: { type: 'string' }, expected: false },
    { propertyName: 'test', schema: { type: 'number' }, expected: false },
    { propertyName: 'test', schema: { type: 'object' }, expected: false },
    { propertyName: 'test', schema: { type: 'array' }, expected: false },
    { propertyName: 'test', schema: { type: 'boolean' }, expected: false },
  ] as const)('should apply to string properties', ({ propertyName, schema, expected }) => {
    const applies = simpleLanguageSuggestionProvider.appliesTo(propertyName, schema);
    expect(applies).toBe(expected);
  });

  it('should return suggestions when `word` it is specified', async () => {
    const word = 'test';
    const suggestions = await simpleLanguageSuggestionProvider.getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should return suggestions when `word` it is not specified', async () => {
    const word = '';
    const suggestions = await simpleLanguageSuggestionProvider.getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should return suggestions from the catalog', async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Function, catalogsMap.functionsCatalogMap);

    const word = '';
    const suggestions = await simpleLanguageSuggestionProvider.getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });
});
