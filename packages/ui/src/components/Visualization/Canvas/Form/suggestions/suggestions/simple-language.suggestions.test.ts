import { CatalogLibrary } from '@kaoto/camel-catalog/catalog-index.d.ts';
import catalogLibrary from '@kaoto/camel-catalog/index.json';

import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { IMetadataApi } from '../../../../../../providers';
import { getFirstCatalogMap } from '../../../../../../stubs/test-load-catalog';
import { getSimpleLanguageSuggestionProvider } from './simple-language.suggestions';

describe('Properties Suggestions', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Function, catalogsMap.functionsCatalogMap);
  });

  it.each([
    { propertyName: 'simple.expression', schema: { type: 'string' }, expected: true },
    { propertyName: '#.message', schema: { type: 'string' }, expected: true },
    { propertyName: 'test', schema: { type: 'string' }, expected: false },
    { propertyName: 'test', schema: { type: 'number' }, expected: false },
    { propertyName: 'test', schema: { type: 'object' }, expected: false },
    { propertyName: 'test', schema: { type: 'array' }, expected: false },
    { propertyName: 'test', schema: { type: 'boolean' }, expected: false },
  ] as const)('should apply to string properties', ({ propertyName, schema, expected }) => {
    const applies = getSimpleLanguageSuggestionProvider().appliesTo(propertyName, schema);
    expect(applies).toBe(expected);
  });

  it('should use `foo` if word is empty', async () => {
    const word = '';
    const suggestions = await getSimpleLanguageSuggestionProvider().getSuggestions(word, {
      inputValue: 'foo example',
      cursorPosition: 0,
      propertyName: 'foo-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should return suggestions when `word` it is specified', async () => {
    const word = 'test';
    const suggestions = await getSimpleLanguageSuggestionProvider().getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should return suggestions when `word` it is not specified', async () => {
    const word = '';
    const suggestions = await getSimpleLanguageSuggestionProvider().getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should use the CamelCatalogService to query available functions', async () => {
    const catalogSpy = jest.spyOn(CamelCatalogService, 'getComponent');
    const word = '';
    await getSimpleLanguageSuggestionProvider().getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(catalogSpy).toHaveBeenCalledWith(CatalogKind.Function, 'simple');
  });

  it('should return suggestions from the catalog', async () => {
    const word = '';
    const suggestions = await getSimpleLanguageSuggestionProvider().getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should generate basic functions if the catalog is not available', async () => {
    jest.spyOn(CamelCatalogService, 'getComponent').mockReturnValueOnce(undefined);
    const suggestions = await getSimpleLanguageSuggestionProvider().getSuggestions('test', {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toEqual(
      expect.arrayContaining([
        { value: '${variable.test}' },
        { value: '${header.test}' },
        { value: '${body}', group: 'Simple Language' },
        { value: '${env.test}' },
      ]),
    );
  });

  it('should return suggestions from the catalog with metadata', async () => {
    const metadataMock: IMetadataApi['getSuggestions'] = jest.fn().mockResolvedValue([{ value: 'mocked-suggestion' }]);

    const provider = getSimpleLanguageSuggestionProvider(metadataMock);
    const suggestions = await provider.getSuggestions('test', { inputValue: '', cursorPosition: 0, propertyName: '' });

    expect(metadataMock).toHaveBeenCalledWith('env', 'test', { inputValue: '', cursorPosition: 0, propertyName: '' });
    expect(suggestions).toEqual(
      expect.arrayContaining([
        {
          value: `\${env:mocked-suggestion}`,
          description: `Use the 'mocked-suggestion' OS environment variable`,
          group: 'Simple Language: Environment variables',
        },
      ]),
    );
  });

  it('should return default suggestions when no metadata API is provided', async () => {
    const provider = getSimpleLanguageSuggestionProvider();
    const suggestions = await provider.getSuggestions('test', { inputValue: '', cursorPosition: 0, propertyName: '' });

    expect(suggestions).toEqual(
      expect.arrayContaining([
        {
          value: `\${env.test}`,
          description: 'The OS environment variable with the given name',
        },
      ]),
    );
  });
});
