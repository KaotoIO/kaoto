import { Suggestion, SuggestionProvider } from '@kaoto/forms';

import { DynamicCatalogRegistry } from '../../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind } from '../../../../../../../models';

const VALIDATION_MATCHER_ACTIVATED_FIELDS = [
  /^#\.validate\.\d+\.value$/,
  /^#\.validate\.\d+\.jsonPath\.\d+\.value$/,
  /^#\.validate\.\d+\.xpath\.\d+\.value$/,
  /^#\.message\.body\.data$/,
  /^#\.message\.headers\.\d+\.value$/,
  /^#\.response\.body\.data$/,
  /^#\.response\.headers\.\d+\.value$/,
  /^#\.message\.expression\.\d+\.path$/,
  /^#\.message\.expression\.\d+\.value$/,
  /^#\.extract\.body\.\d+\.path$/,
  /^#\.extract\.header\.\d+\.name$/,
];

export const testValidationMatcherSuggestionProvider: SuggestionProvider = {
  id: 'test-validation-matcher-suggestion-provider',
  appliesTo: (propName, schema) => {
    return VALIDATION_MATCHER_ACTIVATED_FIELDS.some((expr) => expr.test(propName)) && schema.type === 'string';
  },
  getSuggestions: async (_word, _context) => {
    const suggestions: Suggestion[] = [];

    const matchersCatalog =
      (await DynamicCatalogRegistry.get().getCatalog(CatalogKind.TestValidationMatcher)?.getAll()) ?? {};
    for (const matcherKey in matchersCatalog) {
      const matcherDef = matchersCatalog[matcherKey];
      const props = matcherDef.propertiesSchema?.properties;
      const matcherParams: string[] = [];
      for (const key in props) {
        const paramName = props[key].type === 'array' ? `${key}[]` : key;
        if (((matcherDef.propertiesSchema?.required as string[]) || []).includes(key)) {
          matcherParams.push(`${paramName}`);
        } else {
          matcherParams.push(`${paramName}?`);
        }
      }

      suggestions.push({
        value: `@${matcherKey}(${matcherParams.join(',')})@`,
        description: matcherDef.description || `Use the '${matcherKey}' validationMatcher`,
        group: 'Validation Matcher',
      });
    }

    return suggestions;
  },
};
