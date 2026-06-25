// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const mathFunctions: IFunctionDefinition[] = [
  {
    name: 'math:pi',
    displayName: 'Pi',
    description: 'Returns an approximation to the mathematical constant π.',
    returnType: Types.Double,
    arguments: [],
  },
  {
    name: 'math:exp',
    displayName: 'Exp',
    description: 'Returns the value of ex.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:exp10',
    displayName: 'Exp10',
    description: 'Returns the value of 10x.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:log',
    displayName: 'Log',
    description: 'Returns the natural logarithm of the argument.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:log10',
    displayName: 'Log10',
    description: 'Returns the base-ten logarithm of the argument.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:sqrt',
    displayName: 'Sqrt',
    description: 'Returns the non-negative square root of the argument.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:pow',
    displayName: 'Pow',
    description: 'Returns the result of raising the first argument to the power of the second.',
    returnType: Types.Double,
    arguments: [
      { name: 'x', displayName: '$x', description: 'X', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
      { name: 'y', displayName: '$y', description: 'Y', type: Types.Numeric, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:sin',
    displayName: 'Sin',
    description: 'Returns the sine of the argument. The argument is an angle in radians.',
    returnType: Types.Double,
    arguments: [{ name: 'θ', displayName: '$θ', description: 'Θ', type: Types.Double, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'math:cos',
    displayName: 'Cos',
    description: 'Returns the cosine of the argument. The argument is an angle in radians.',
    returnType: Types.Double,
    arguments: [{ name: 'θ', displayName: '$θ', description: 'Θ', type: Types.Double, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'math:tan',
    displayName: 'Tan',
    description: 'Returns the tangent of the argument. The argument is an angle in radians.',
    returnType: Types.Double,
    arguments: [{ name: 'θ', displayName: '$θ', description: 'Θ', type: Types.Double, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'math:asin',
    displayName: 'Asin',
    description: 'Returns the arc sine of the argument.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:acos',
    displayName: 'Acos',
    description: 'Returns the arc cosine of the argument.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:atan',
    displayName: 'Atan',
    description: 'Returns the arc tangent of the argument.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'math:atan2',
    displayName: 'Atan2',
    description:
      'Returns the angle in radians subtended at the origin by the point on a plane with coordinates (x, y) and the positive x-axis.',
    returnType: Types.Double,
    arguments: [
      { name: 'y', displayName: '$y', description: 'Y', type: Types.Double, minOccurs: 1, maxOccurs: 1 },
      { name: 'x', displayName: '$x', description: 'X', type: Types.Double, minOccurs: 1, maxOccurs: 1 },
    ],
  },
];
