import { Suggestion, SuggestionProvider } from '@kaoto/forms';

import { CamelCatalogService, CatalogKind } from '../../../../../../../models';

const FUNCTION_ACTIVATED_FIELDS = [
  new RegExp(`^#.message.body.data$`),
  new RegExp(`^#.message.headers.\\d.value$`),
  new RegExp(`^#.response.body.\\d.data$`),
  new RegExp(`^#.response.headers.\\d.value$`),
  new RegExp(`^#.message.expression.\\d.value$`),
  new RegExp(`^#.extract.body.\\d.path$`),
];

export const testFunctionSuggestionProvider: SuggestionProvider = {
  id: 'test-function-suggestion-provider',
  appliesTo: (propName, schema) => {
    return FUNCTION_ACTIVATED_FIELDS.find((expr) => expr.test(propName)) !== undefined && schema.type === 'string';
  },
  getSuggestions: async (_word, _context) => {
    const suggestions: Suggestion[] = [];

    const functionsCatalog = CamelCatalogService.getCatalogByKey(CatalogKind.TestFunction) ?? {};
    for (const functionKey in functionsCatalog) {
      const functionDef = functionsCatalog[functionKey];
      const props = functionDef.propertiesSchema?.properties;
      const functionParams: string[] = [];
      for (const key in props) {
        const paramName = props[key].type === 'array' ? `${key}[]` : key;
        if (((functionDef.propertiesSchema?.required as string[]) || []).includes(key)) {
          functionParams.push(`${paramName}`);
        } else {
          functionParams.push(`${paramName}?`);
        }
      }

      suggestions.push({
        value: `citrus:${functionKey}(${functionParams.join(',')})`,
        description: functionDef.description || `Use the '${functionKey}' function`,
        group: 'Functions',
      });
    }

    return suggestions;
  },
};
