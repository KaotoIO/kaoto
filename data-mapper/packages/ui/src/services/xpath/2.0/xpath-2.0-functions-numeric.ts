import { Types } from '../../../models/types';

/**
 * 6.4 Numeric - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#numeric-value-functions
 */
export const numericFunctions = [
  {
    name: 'abs',
    displayName: 'Absolute',
    description: 'Returns the absolute value of the argument.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.Numeric, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'ceiling',
    displayName: 'Ceiling',
    description: 'Returns the smallest number with no fractional part that is greater than or equal to the argument.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.Numeric, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'floor',
    displayName: 'Floor',
    group: 'Numeric',
    description: 'Returns the largest number with no fractional part that is less than or equal to the argument.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: 'arg', description: 'Argument', type: Types.Numeric, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'round',
    displayName: 'Round',
    description: 'Rounds to the nearest number with no fractional part.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.Numeric, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'round-half-to-even',
    displayName: 'Round Half To Even',
    description:
      'Takes a number and a precision and returns a number rounded to the given precision. If the fractional part' +
      ' is exactly half, the result is the number whose least significant digit is even.',
    returnType: Types.Numeric,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.Numeric, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'precision',
        displayName: 'Precision',
        description: 'Precision',
        type: Types.Integer,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
];
