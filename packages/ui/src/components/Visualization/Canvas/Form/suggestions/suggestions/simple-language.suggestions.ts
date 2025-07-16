import { Suggestion, SuggestionProvider } from '@kaoto/forms';
import { CamelCatalogService, CatalogKind } from '../../../../../../models';

const SIMPLE_LANGUAGE_ACTIVATED_FIELDS = [
  '#.message', // This is a special case for the Log EIP
  'simple.expression',
];

// This provider suggests syntax from: https://camel.apache.org/components/next/languages/simple-language.html
export const simpleLanguageSuggestionProvider: SuggestionProvider = {
  id: 'simple-language-suggestion-provider',
  appliesTo: (propName, schema) => SIMPLE_LANGUAGE_ACTIVATED_FIELDS.includes(propName) && schema.type === 'string',
  getSuggestions: async (word, _context) => {
    const suggestionWord = word !== '' ? word : 'name';
    const suggestionWordLowercase = suggestionWord.toLowerCase();

    const simpleLangFunctions = CamelCatalogService.getComponent(CatalogKind.Function, 'simple') ?? {};
    const {
      body,
      ['variable.name']: variableName,
      ['header.name']: headerName,
      ...remainingFunctions
    } = simpleLangFunctions;

    const suggestions: Suggestion[] = [
      { value: `\${variable.${suggestionWord}}`, description: variableName?.description },
      { value: `\${header.${suggestionWord}}`, description: headerName?.description },
    ];

    const bodySuggestion: Suggestion = { value: '${body}', description: body?.description };
    if (word === '') {
      suggestions.unshift(bodySuggestion);
    } else {
      suggestions.push({ ...bodySuggestion, group: 'Simple Language' });
    }

    return suggestions.concat(
      Object.entries(remainingFunctions)
        .filter(([name]) => word === '' || name.toLowerCase().startsWith(suggestionWordLowercase))
        .map(([name, func]) => ({
          value: `\${${name}}`,
          description: func.description,
          group: 'Simple Language',
        })),
    );
  },
};
