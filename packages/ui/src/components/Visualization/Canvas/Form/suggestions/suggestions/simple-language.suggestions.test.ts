import { simpleLanguageSuggestionProvider } from './simple-language.suggestions';

describe('Properties Suggestions', () => {
  it.each([
    { propertyName: 'test', schema: { type: 'string' }, expected: true },
    { propertyName: 'test', schema: { type: 'number' }, expected: false },
    { propertyName: 'test', schema: { type: 'object' }, expected: false },
    { propertyName: 'test', schema: { type: 'array' }, expected: false },
    { propertyName: 'test', schema: { type: 'boolean' }, expected: false },
  ] as const)('should apply to string properties', ({ propertyName, schema, expected }) => {
    const applies = simpleLanguageSuggestionProvider.appliesTo(propertyName, schema);
    expect(applies).toBe(expected);
  });

  it('should return suggestions', async () => {
    const word = 'test';
    const suggestions = await simpleLanguageSuggestionProvider.getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });
});
