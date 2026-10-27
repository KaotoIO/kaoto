import { Suggestion, SuggestionProvider } from '@kaoto/forms';

import { CitrusTestResource } from '../../../../../../../models/citrus/citrus-test-resource';
import { KaotoResource } from '../../../../../../../models/kaoto-resource';

const VARIABLE_ACTIVATED_FIELDS = [
  /^#\.variables\.\d+\.value$/,
  /^#\.validate\.\d+\.value$/,
  /^#\.validate\.\d+\.jsonPath\.\d+\.value$/,
  /^#\.validate\.\d+\.xpath\.\d+\.value$/,
  /^#\.ignore\.\d+\.path$/,
  /^#\.message\.body\.data$/,
  /^#\.message\.headers\.\d+\.value$/,
  /^#\.response\.body\.data$/,
  /^#\.response\.headers\.\d+\.value$/,
  /^#\.message\.expression\.\d+\.path$/,
  /^#\.message\.expression\.\d+\.value$/,
  /^#\.extract\.body\.\d+\.path$/,
  /^#\.extract\.header\.\d+\.name$/,
];

export const getTestVariableSuggestionProvider = (camelResource: KaotoResource | undefined): SuggestionProvider => {
  const extractRawName = (expression: string): string => {
    let result;
    if (expression.startsWith('${')) {
      // remove test variable prefix
      result = expression.substring(2);

      // remove test variable suffix if any
      if (result.endsWith('}')) {
        result = result.substring(0, result.length - 1);
      }
    } else if (expression.startsWith('citrus:')) {
      result = 'var_name';
    } else if (expression.startsWith('@') || expression.endsWith('@')) {
      result = 'var_name';
    } else {
      result = expression;
    }

    return result;
  };

  return {
    id: 'test-variable-suggestion-provider',
    appliesTo: (propName, schema) => {
      return VARIABLE_ACTIVATED_FIELDS.some((expr) => expr.test(propName)) && schema.type === 'string';
    },
    getSuggestions: (word, _context) => {
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
