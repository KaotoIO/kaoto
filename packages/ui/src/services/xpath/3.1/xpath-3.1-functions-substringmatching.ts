// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const substringMatchingFunctions: IFunctionDefinition[] = [
  {
    name: 'contains',
    displayName: 'Contains',
    description: 'Returns true if the string $arg1 contains $arg2 as a substring, taking collations into account.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: 'Arg1', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: 'Arg2', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: 'Collation',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'starts-with',
    displayName: 'Starts With',
    description:
      'Returns true if the string $arg1 contains $arg2 as a leading substring, taking collations into account.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: 'Arg1', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: 'Arg2', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: 'Collation',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'ends-with',
    displayName: 'Ends With',
    description:
      'Returns true if the string $arg1 contains $arg2 as a trailing substring, taking collations into account.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: 'Arg1', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: 'Arg2', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: 'Collation',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'substring-before',
    displayName: 'Substring Before',
    description:
      'Returns the part of $arg1 that precedes the first occurrence of $arg2, taking collations into account.',
    returnType: Types.String,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: 'Arg1', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: 'Arg2', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: 'Collation',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'substring-after',
    displayName: 'Substring After',
    description:
      'Returns the part of $arg1 that follows the first occurrence of $arg2, taking collations into account.',
    returnType: Types.String,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: 'Arg1', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: 'Arg2', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: 'Collation',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
];
