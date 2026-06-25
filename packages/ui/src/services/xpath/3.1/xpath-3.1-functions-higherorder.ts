// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const higherOrderFunctions: IFunctionDefinition[] = [
  {
    name: 'function-lookup',
    displayName: 'Function Lookup',
    description: 'Returns the function having a given name and arity, if there is one.',
    returnType: Types.FunctionType,
    arguments: [
      { name: 'name', displayName: '$name', description: 'Name', type: Types.QName, minOccurs: 1, maxOccurs: 1 },
      { name: 'arity', displayName: '$arity', description: 'Arity', type: Types.Integer, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'function-name',
    displayName: 'Function Name',
    description: 'Returns the name of the function identified by a function item.',
    returnType: Types.QName,
    arguments: [
      { name: 'func', displayName: '$func', description: 'Func', type: Types.FunctionType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'function-arity',
    displayName: 'Function Arity',
    description: 'Returns the arity of the function identified by a function item.',
    returnType: Types.Integer,
    arguments: [
      { name: 'func', displayName: '$func', description: 'Func', type: Types.FunctionType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'for-each',
    displayName: 'For Each',
    description:
      'Applies the function item $action to every item from the sequence $seq in turn, returning the concatenation of the resulting sequences in order.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'seq',
        displayName: '$seq',
        description: 'Seq',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
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
    name: 'filter',
    displayName: 'Filter',
    description: 'Returns those items from the sequence $seq for which the supplied function $f returns true.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'seq',
        displayName: '$seq',
        description: 'Seq',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'f', displayName: '$f', description: 'F', type: Types.FunctionType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'fold-left',
    displayName: 'Fold Left',
    description:
      'Processes the supplied sequence from left to right, applying the supplied function repeatedly to each item in turn, together with an accumulated result value.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'seq',
        displayName: '$seq',
        description: 'Seq',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'zero',
        displayName: '$zero',
        description: 'Zero',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'f', displayName: '$f', description: 'F', type: Types.FunctionType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'fold-right',
    displayName: 'Fold Right',
    description:
      'Processes the supplied sequence from right to left, applying the supplied function repeatedly to each item in turn, together with an accumulated result value.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'seq',
        displayName: '$seq',
        description: 'Seq',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'zero',
        displayName: '$zero',
        description: 'Zero',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'f', displayName: '$f', description: 'F', type: Types.FunctionType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'for-each-pair',
    displayName: 'For Each Pair',
    description:
      'Applies the function item $action to successive pairs of items taken one from $seq1 and one from $seq2, returning the concatenation of the resulting sequences in order.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'seq1',
        displayName: '$seq1',
        description: 'Seq1',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'seq2',
        displayName: '$seq2',
        description: 'Seq2',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
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
    name: 'sort',
    displayName: 'Sort',
    description: 'Sorts a supplied sequence, based on the value of a sort key supplied as a function.',
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
    name: 'apply',
    displayName: 'Apply',
    description: 'Makes a dynamic call on a function with an argument list supplied in the form of an array.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'function',
        displayName: '$function',
        description: 'Function',
        type: Types.FunctionType,
        minOccurs: 1,
        maxOccurs: 1,
      },
      { name: 'array', displayName: '$array', description: 'Array', type: Types.Array, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'load-xquery-module',
    displayName: 'Load Xquery Module',
    description:
      'Provides access to the public functions and global variables of a dynamically-loaded XQuery library module.',
    returnType: Types.Map,
    arguments: [
      {
        name: 'module-uri',
        displayName: '$module-uri',
        description: 'Module Uri',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      { name: 'options', displayName: '$options', description: 'Options', type: Types.Map, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'transform',
    displayName: 'Transform',
    description: 'Invokes a transformation using a dynamically-loaded XSLT stylesheet.',
    returnType: Types.Map,
    arguments: [
      { name: 'options', displayName: '$options', description: 'Options', type: Types.Map, minOccurs: 1, maxOccurs: 1 },
    ],
  },
];
