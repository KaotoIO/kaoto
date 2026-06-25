// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const numericFunctions: IFunctionDefinition[] = [
  {
    name: 'abs',
    displayName: 'Abs',
    description: 'Returns the absolute value of $arg.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Numeric, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'ceiling',
    displayName: 'Ceiling',
    description: 'Rounds $arg upwards to a whole number.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Numeric, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'floor',
    displayName: 'Floor',
    description: 'Rounds $arg downwards to a whole number.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Numeric, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'round',
    displayName: 'Round',
    description:
      'Rounds a value to a specified number of decimal places, rounding upwards if two such values are equally near.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Numeric, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'precision',
        displayName: '$precision',
        description: 'Precision',
        type: Types.Integer,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'round-half-to-even',
    displayName: 'Round Half To Even',
    description:
      'Rounds a value to a specified number of decimal places, rounding to make the last digit even if two such values are equally near.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Numeric, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'precision',
        displayName: '$precision',
        description: 'Precision',
        type: Types.Integer,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'format-integer',
    displayName: 'Format Integer',
    description:
      'Formats an integer according to a given picture string, using the conventions of a given natural language if specified.',
    returnType: Types.String,
    arguments: [
      { name: 'value', displayName: '$value', description: 'Value', type: Types.Integer, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'picture',
        displayName: '$picture',
        description: 'Picture',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      { name: 'lang', displayName: '$lang', description: 'Lang', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'format-number',
    displayName: 'Format Number',
    description:
      'Returns a string containing a number formatted according to a given picture string, taking account of decimal formats specified in the static context.',
    returnType: Types.String,
    arguments: [
      { name: 'value', displayName: '$value', description: 'Value', type: Types.Numeric, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'picture',
        displayName: '$picture',
        description: 'Picture',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'decimal-format-name',
        displayName: '$decimal-format-name',
        description: 'Decimal Format Name',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'number',
    displayName: 'Number',
    description:
      'Returns the value indicated by $arg or, if $arg is not specified, the context item after atomization, converted to an xs:double.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.AnyAtomicType, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'random-number-generator',
    displayName: 'Random Number Generator',
    description: 'Returns a random number generator, which can be used to generate sequences of random numbers.',
    returnType: Types.Map,
    arguments: [
      {
        name: 'seed',
        displayName: '$seed',
        description: 'Seed',
        type: Types.AnyAtomicType,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
];
