import { CatalogLibrary } from '@kaoto/camel-catalog/catalog-index.d.ts';
import catalogLibrary from '@kaoto/camel-catalog/index.json';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../../models';
import { IMetadataApi } from '../../../../../../providers';
import { getFirstCatalogMap, setupDynamicCatalogRegistry } from '../../../../../../stubs/test-load-catalog';
import { getSimpleLanguageSuggestionProvider } from './simple-language.suggestions';

describe('Properties Suggestions', () => {
  beforeEach(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    setupDynamicCatalogRegistry(catalogsMap);
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

  it.each([
    { word: '', inputValue: 'foo example', propertyName: 'foo-property' },
    { word: 'test', inputValue: 'test example', propertyName: 'test-property' },
    { word: '', inputValue: 'test example', propertyName: 'test-property' },
  ] as const)(
    'should return suggestions for word="$word" inputValue="$inputValue"',
    async ({ word, inputValue, propertyName }) => {
      const suggestions = await getSimpleLanguageSuggestionProvider().getSuggestions(word, {
        inputValue,
        cursorPosition: 0,
        propertyName,
      });

      expect(suggestions).toMatchSnapshot();
    },
  );

  it('should use the DynamicCatalogRegistry to query available functions', async () => {
    const registrySpy = vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity');
    const word = '';
    await getSimpleLanguageSuggestionProvider().getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(registrySpy).toHaveBeenCalledWith(CatalogKind.Function, 'simple');
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
    vi.spyOn(DynamicCatalogRegistry.get(), 'getEntity').mockResolvedValueOnce(undefined);
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
    const metadataMock: IMetadataApi['getSuggestions'] = vi.fn().mockResolvedValue([{ value: 'mocked-suggestion' }]);

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
