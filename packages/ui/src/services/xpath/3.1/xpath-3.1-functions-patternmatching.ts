// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const patternMatchingFunctions: IFunctionDefinition[] = [
  {
    name: 'matches',
    displayName: 'Matches',
    description: 'Returns true if the supplied string matches a given regular expression.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'input', displayName: '$input', description: 'Input', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'pattern',
        displayName: '$pattern',
        description: 'Pattern',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      { name: 'flags', displayName: '$flags', description: 'Flags', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'replace',
    displayName: 'Replace',
    description:
      'Returns a string produced from the input string by replacing any substrings that match a given regular expression with a supplied replacement string.',
    returnType: Types.String,
    arguments: [
      { name: 'input', displayName: '$input', description: 'Input', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'pattern',
        displayName: '$pattern',
        description: 'Pattern',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'replacement',
        displayName: '$replacement',
        description: 'Replacement',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      { name: 'flags', displayName: '$flags', description: 'Flags', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'tokenize',
    displayName: 'Tokenize',
    description:
      'Returns a sequence of strings constructed by splitting the input wherever a separator is found; the separator is any substring that matches a given regular expression.',
    returnType: Types.String,
    returnCollection: true,
    arguments: [
      { name: 'input', displayName: '$input', description: 'Input', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'pattern',
        displayName: '$pattern',
        description: 'Pattern',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'flags', displayName: '$flags', description: 'Flags', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'analyze-string',
    displayName: 'Analyze String',
    description:
      'Analyzes a string using a regular expression, returning an XML structure that identifies which parts of the input string matched or failed to match the regular expression, and in the case of matched substrings, which substrings matched each capturing group in the regular expression.',
    returnType: Types.Element,
    arguments: [
      { name: 'input', displayName: '$input', description: 'Input', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'pattern',
        displayName: '$pattern',
        description: 'Pattern',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      { name: 'flags', displayName: '$flags', description: 'Flags', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
];
