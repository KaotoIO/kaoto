import { Suggestion, SuggestionProvider } from '@kaoto/forms';

import { CamelResource } from '../../../../../../../models/camel';
import { CitrusTestResource } from '../../../../../../../models/citrus/citrus-test-resource';

const VARIABLE_ACTIVATED_FIELDS = [
  new RegExp(`^#.validate.\\d.value$`),
  new RegExp(`^#.validate.\\d.jsonPath.\\d.value$`),
  new RegExp(`^#.validate.\\d.xpath.\\d.value$`),
  new RegExp(`^#.ignore.\\d.path$`),
  new RegExp(`^#.message.body.data$`),
  new RegExp(`^#.message.headers.\\d.value$`),
  new RegExp(`^#.response.body.\\d.data$`),
  new RegExp(`^#.response.headers.\\d.value$`),
  new RegExp(`^#.message.expression.\\d.path$`),
  new RegExp(`^#.message.expression.\\d.value$`),
  new RegExp(`^#.extract.body.\\d.path$`),
  new RegExp(`^#.extract.header.\\d.name$`),
];

export const getTestVariableSuggestionProvider = (camelResource: CamelResource | undefined): SuggestionProvider => {
  const extractRawName = (expression: string): string => {
    let result;
    if (expression.startsWith('${')) {
      // remove test variable prefix
      result = expression.substring(2);

      // remove test variable suffix if any
      if (result.endsWith('}')) {
        result = result.substring(0, result.length - 1);
      }
    } else if (expression.startsWith('citrus:') || expression.startsWith('@')) {
      // expression is a Citrus function - do not suggest as test variable
      result = 'var_name';
    } else if (expression.startsWith('@') || expression.endsWith('@')) {
      // expression is a Citrus validation matcher - do not suggest as test variable
      result = 'var_name';
    } else {
      result = expression;
    }

    return result;
  };

  return {
    id: 'test-variable-suggestion-provider',
    appliesTo: (propName, schema) => {
      return VARIABLE_ACTIVATED_FIELDS.find((expr) => expr.test(propName)) !== undefined && schema.type === 'string';
    },
    getSuggestions: async (word, _context) => {
      console.log(_context);
      const suggestionWord = word !== '' ? extractRawName(word) : 'var_name';

      const suggestions: Suggestion[] = [
        {
          value: `\${${suggestionWord}}`,
          description: `Reference the '${suggestionWord}' variable`,
          group: 'Test variables',
        },
      ];

      const testResource = camelResource as CitrusTestResource;
      const variables: string[] = testResource?.getVariables() || [];
      for (const variable of variables.filter((value) => value !== suggestionWord)) {
        suggestions.push({
          value: `\${${variable}}`,
          description: `Reference the '${variable}' variable`,
          group: 'Test variables',
        });
      }

      return suggestions;
    },
  };
};
