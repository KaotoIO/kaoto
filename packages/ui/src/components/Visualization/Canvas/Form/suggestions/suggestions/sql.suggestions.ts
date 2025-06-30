// Example of SQL syntax suggestion provider

import { SuggestionProvider } from '@kaoto/forms';
import { simpleLanguageSuggestionProvider } from './simple-language.suggestions';

// This provider suggests syntax from: https://camel.apache.org/components/next/languages/sql.html
export const sqlSyntaxSuggestionProvider: SuggestionProvider = {
  ...simpleLanguageSuggestionProvider,
  id: 'sql-syntax-suggestion-provider',
  getSuggestions: async (word, _context) => {
    const localSuggestions = await simpleLanguageSuggestionProvider.getSuggestions(word, _context);

    return localSuggestions.map((suggestion) => ({
      ...suggestion,
      value: `#${suggestion.value}`,
      description: `SQL: ${suggestion.description}`,
      group: 'SQL Syntax',
    }));
  },
};
