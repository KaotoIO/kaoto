import { Suggestion, SuggestionProvider } from '@kaoto/forms';
import { CamelCatalogService, CatalogKind } from '../../../../../../models';
import { IMetadataApi } from '../../../../../../providers';

const SIMPLE_LANGUAGE_ACTIVATED_FIELDS = [
  '#.message', // This is a special case for the Log EIP
  'simple.expression',
];

// This provider suggests syntax from: https://camel.apache.org/components/next/languages/simple-language.html
export const getSimpleLanguageSuggestionProvider = (metadata?: IMetadataApi['getSuggestions']): SuggestionProvider => {
  return {
    id: 'simple-language-suggestion-provider',
    appliesTo: (propName, schema) => SIMPLE_LANGUAGE_ACTIVATED_FIELDS.includes(propName) && schema.type === 'string',
    getSuggestions: async (word, context) => {
      const normalizedWord = word !== '' ? word : 'name';
      const normalizedWordLowercase = normalizedWord.toLowerCase();

      const simpleLangFunctions = CamelCatalogService.getComponent(CatalogKind.Function, 'simple') ?? {};
      const {
        body,
        ['variable.name']: variableName,
        ['header.name']: headerName,
        ['env.name']: envName,
        ...remainingFunctions
      } = simpleLangFunctions;

      const suggestions: Suggestion[] = [
        { value: `\${variable.${normalizedWord}}`, description: variableName?.description },
        { value: `\${header.${normalizedWord}}`, description: headerName?.description },
      ];

      const bodySuggestion: Suggestion = { value: '${body}', description: body?.description };
      if (word === '') {
        suggestions.unshift(bodySuggestion);
      } else {
        suggestions.push({ ...bodySuggestion, group: 'Simple Language' });
      }

      const environmentVariables = (await metadata?.('env', word, context)) ?? [];
      const environmentVariablesSuggestions = environmentVariables.map((item) => ({
        value: `\${env:${item.value}}`,
        description: `Use the '${item.value}' OS environment variable`,
        group: 'Simple Language: Environment variables',
      }));
      if (environmentVariablesSuggestions.length > 0) {
        suggestions.push(...environmentVariablesSuggestions);
      } else {
        suggestions.push({ value: `\${env.${normalizedWord}}`, description: envName?.description });
      }

      return suggestions.concat(
        Object.entries(remainingFunctions)
          .filter(([name]) => word === '' || name.toLowerCase().startsWith(normalizedWordLowercase))
          .map(([name, func]) => ({
            value: `\${${name}}`,
            description: func.description,
            group: 'Simple Language',
          })),
      );
    },
  };
};
