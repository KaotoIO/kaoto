import { IMetadataApi } from '../../../../../../providers';
import { getPropertiesSuggestionProvider } from './properties.suggestions';

describe('Properties Suggestions', () => {
  it.each([
    { propertyName: 'test', schema: { type: 'string' }, expected: true },
    { propertyName: 'test', schema: { type: 'number' }, expected: false },
    { propertyName: 'test', schema: { type: 'object' }, expected: false },
    { propertyName: 'test', schema: { type: 'array' }, expected: false },
    { propertyName: 'test', schema: { type: 'boolean' }, expected: false },
  ] as const)('should apply to string properties', ({ propertyName, schema, expected }) => {
    const applies = getPropertiesSuggestionProvider().appliesTo(propertyName, schema);
    expect(applies).toBe(expected);
  });

  it('should return suggestions', async () => {
    const word = 'test';
    const suggestions = await getPropertiesSuggestionProvider().getSuggestions(word, {
      inputValue: 'test example',
      cursorPosition: 0,
      propertyName: 'test-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should use `foo` if word is empty', async () => {
    const word = '';
    const suggestions = await getPropertiesSuggestionProvider().getSuggestions(word, {
      inputValue: 'foo example',
      cursorPosition: 0,
      propertyName: 'foo-property',
    });

    expect(suggestions).toMatchSnapshot();
  });

  it('should use metdata API for suggestions', async () => {
    const metadataMock: IMetadataApi['getSuggestions'] = jest.fn().mockResolvedValue([{ value: 'mocked-suggestion' }]);

    const provider = getPropertiesSuggestionProvider(metadataMock);
    const suggestions = await provider.getSuggestions('test', { inputValue: '', cursorPosition: 0, propertyName: '' });

    expect(metadataMock).toHaveBeenCalledWith('env', 'test', { inputValue: '', cursorPosition: 0, propertyName: '' });
    expect(suggestions).toEqual(
      expect.arrayContaining([
        {
          value: `{{env:mocked-suggestion}}`,
          description: `Use the 'mocked-suggestion' OS environment variable`,
          group: 'Placeholders: Environment variables',
        },
      ]),
    );
  });

  it('should add the default `{{env:name}}` syntax if there is no metdata API for suggestions', async () => {
    const provider = getPropertiesSuggestionProvider();
    const suggestions = await provider.getSuggestions('test', { inputValue: '', cursorPosition: 0, propertyName: '' });

    expect(suggestions).toEqual(
      expect.arrayContaining([
        {
          value: `{{env:test}}`,
          description: `Use the 'test' OS environment variable`,
          group: 'Placeholders: Environment variables',
        },
      ]),
    );
  });
});
