import { SuggestionProvider } from '@kaoto/forms';

// This provider suggests syntax from: https://camel.apache.org/components/next/languages/simple-language.html
export const simpleLanguageSuggestionProvider: SuggestionProvider = {
  id: 'simple-language-suggestion-provider',
  appliesTo: (_propName, schema) => schema.type === 'string',
  getSuggestions: async (word, _context) => {
    // If the word is empty, use `foo` as a placeholder
    word ??= 'foo';

    return [
      {
        value: '${body}',
        description: 'Use the body of the message',
        group: 'Simple Language',
      },
      {
        value: `\${header.${word}}`,
        description: `Use the '${word}' header of the message`,
        group: 'Simple Language',
      },
      {
        value: `\${variable.${word}}`,
        description: `Use the '${word}' variable of the message`,
        group: 'Simple Language',
      },
    ];
  },
};
