import { Suggestion, SuggestionProvider } from '@kaoto/forms';

import { DynamicCatalogRegistry } from '../../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../../../models';

const FUNCTION_ACTIVATED_FIELDS = [
  /^#\.message\.body\.data$/,
  /^#\.message\.headers\.\d+\.value$/,
  /^#\.response\.body\.data$/,
  /^#\.response\.headers\.\d+\.value$/,
  /^#\.message\.expression\.\d+\.value$/,
  /^#\.extract\.body\.\d+\.path$/,
  /^#\.variables\.\d+\.value$/,
];

export const testFunctionSuggestionProvider: SuggestionProvider = {
  id: 'test-function-suggestion-provider',
  appliesTo: (propName, schema) => {
    return FUNCTION_ACTIVATED_FIELDS.some((expr) => expr.test(propName)) && schema.type === 'string';
  },
  getSuggestions: async (_word, _context) => {
    const suggestions: Suggestion[] = [];

    const functionsCatalog = (await DynamicCatalogRegistry.get().getCatalog(CatalogKind.TestFunction)?.getAll()) ?? {};
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
