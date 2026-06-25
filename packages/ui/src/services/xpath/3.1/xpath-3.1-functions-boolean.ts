// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const booleanFunctions: IFunctionDefinition[] = [
  {
    name: 'true',
    displayName: 'True',
    description: 'Returns the xs:boolean value true.',
    returnType: Types.Boolean,
    arguments: [],
  },
  {
    name: 'false',
    displayName: 'False',
    description: 'Returns the xs:boolean value false.',
    returnType: Types.Boolean,
    arguments: [],
  },
  {
    name: 'boolean',
    displayName: 'Boolean',
    description: 'Computes the effective boolean value of the sequence $arg.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'not',
    displayName: 'Not',
    description: 'Returns true if the effective boolean value of $arg is false, or false if it is true.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
];
