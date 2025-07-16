// Example of SQL syntax suggestion provider

import { SuggestionProvider } from '@kaoto/forms';
import { simpleLanguageSuggestionProvider } from './simple-language.suggestions';

// This provider suggests syntax from: https://camel.apache.org/components/next/languages/sql.html
export const sqlSyntaxSuggestionProvider: SuggestionProvider = {
  ...simpleLanguageSuggestionProvider,
  id: 'sql-syntax-suggestion-provider',
  appliesTo: (propName, schema) => propName === '#.parameters.query' && schema.type === 'string',
  getSuggestions: async (word, _context) => {
    const suggestionWord = word !== '' ? word : 'foo';

    return [
      {
        value: `:#\${variable.${suggestionWord}}`,
        description: `Reference the '${suggestionWord}' variable`,
      },
      {
        value: `:#\${header.${suggestionWord}}`,
        description: `Reference the '${suggestionWord}' header`,
      },
    ];
  },
};
