// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const arrayFunctions: IFunctionDefinition[] = [
  {
    name: 'array:size',
    displayName: 'Size',
    description: 'Returns the number of members in the supplied array.',
    returnType: Types.Integer,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'array:get',
    displayName: 'Get',
    description: 'Returns the value at the specified position in the supplied array (counting from 1).',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'position',
        displayName: '$position',
        description: 'Position',
        type: Types.Integer,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'array:put',
    displayName: 'Put',
    description:
      'Returns an array containing all the members of a supplied array, except for one member which is replaced with a new value.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'position',
        displayName: '$position',
        description: 'Position',
        type: Types.Integer,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'member',
        displayName: '$member',
        description: 'Member',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'array:append',
    displayName: 'Append',
    description:
      'Returns an array containing all the members of a supplied array, plus one additional member at the end.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'appendage',
        displayName: '$appendage',
        description: 'Appendage',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'array:join',
    displayName: 'Join',
    description: 'Concatenates the contents of several arrays into a single array.',
    returnType: Types.Array,
    arguments: [
      {
        name: 'arrays',
        displayName: '$arrays',
        description: 'Arrays',
        type: Types.Array,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'array:subarray',
    displayName: 'Subarray',
    description:
      'Returns an array containing all members from a supplied array starting at a supplied position, up to a specified length.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      { name: 'start', displayName: '$start', description: 'Start', type: Types.Integer, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'length',
        displayName: '$length',
        description: 'Length',
        type: Types.Integer,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'array:remove',
    displayName: 'Remove',
    description:
      'Returns an array containing all the members of the supplied array, except for the members at specified positions.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'positions',
        displayName: '$positions',
        description: 'Positions',
        type: Types.Integer,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'array:insert-before',
    displayName: 'Insert Before',
    description:
      'Returns an array containing all the members of the supplied array, with one additional member at a specified position.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'position',
        displayName: '$position',
        description: 'Position',
        type: Types.Integer,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'member',
        displayName: '$member',
        description: 'Member',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'array:head',
    displayName: 'Head',
    description: 'Returns the first member of an array, that is $array(1).',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'array:tail',
    displayName: 'Tail',
    description: 'Returns an array containing all members except the first from a supplied array.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'array:reverse',
    displayName: 'Reverse',
    description: 'Returns an array containing all the members of a supplied array, but in reverse order.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'array:for-each',
    displayName: 'For Each',
    description:
      'Returns an array whose size is the same as array:size($array), in which each member is computed by applying $function to the corresponding member of $array.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'action',
        displayName: '$action',
        description: 'Action',
        type: Types.FunctionType,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'array:filter',
    displayName: 'Filter',
    description: 'Returns an array containing those members of the $array for which $function returns true.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'function',
        displayName: '$function',
        description: 'Function',
        type: Types.FunctionType,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'array:fold-left',
    displayName: 'Fold Left',
    description: 'Evaluates the supplied function cumulatively on successive members of the supplied array.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'zero',
        displayName: '$zero',
        description: 'Zero',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'function',
        displayName: '$function',
        description: 'Function',
        type: Types.FunctionType,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'array:fold-right',
    displayName: 'Fold Right',
    description: 'Evaluates the supplied function cumulatively on successive values of the supplied array.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'zero',
        displayName: '$zero',
        description: 'Zero',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'function',
        displayName: '$function',
        description: 'Function',
        type: Types.FunctionType,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'array:for-each-pair',
    displayName: 'For Each Pair',
    description:
      'Returns an array obtained by evaluating the supplied function once for each pair of members at the same position in the two supplied arrays.',
    returnType: Types.Array,
    arguments: [
      { name: 'array1', displayName: '$array1', description: 'Array1', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      { name: 'array2', displayName: '$array2', description: 'Array2', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'function',
        displayName: '$function',
        description: 'Function',
        type: Types.FunctionType,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'array:sort',
    displayName: 'Sort',
    description:
      'Returns an array containing all the members of the supplied array, sorted according to the value of a sort key supplied as a function.',
    returnType: Types.Array,
    arguments: [
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: 'Collation',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'key', displayName: '$key', description: 'Key', type: Types.FunctionType, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'array:flatten',
    displayName: 'Flatten',
    description: 'Replaces any array appearing in a supplied sequence with the members of the array, recursively.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'input',
        displayName: '$input',
        description: 'Input',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
];
