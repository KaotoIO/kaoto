import { Suggestion, SuggestionProvider } from '@kaoto/forms';

import { CamelCatalogService, CatalogKind } from '../../../../../../../models';

const VALIDATION_MATCHER_ACTIVATED_FIELDS = [
  new RegExp(`^#.validate.\\d.value$`),
  new RegExp(`^#.validate.\\d.jsonPath.\\d.value$`),
  new RegExp(`^#.validate.\\d.xpath.\\d.value$`),
  new RegExp(`^#.message.body.data$`),
  new RegExp(`^#.message.headers.\\d.value$`),
  new RegExp(`^#.response.body.\\d.data$`),
  new RegExp(`^#.response.headers.\\d.value$`),
  new RegExp(`^#.message.expression.\\d.path$`),
  new RegExp(`^#.message.expression.\\d.value$`),
  new RegExp(`^#.extract.body.\\d.path$`),
  new RegExp(`^#.extract.header.\\d.name$`),
];

export const testValidationMatcherSuggestionProvider: SuggestionProvider = {
  id: 'test-validation-matcher-suggestion-provider',
  appliesTo: (propName, schema) => {
    return (
      VALIDATION_MATCHER_ACTIVATED_FIELDS.find((expr) => expr.test(propName)) !== undefined && schema.type === 'string'
    );
  },
  getSuggestions: async (_word, _context) => {
    const suggestions: Suggestion[] = [];

    const matchersCatalog = CamelCatalogService.getCatalogByKey(CatalogKind.TestValidationMatcher) ?? {};
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
