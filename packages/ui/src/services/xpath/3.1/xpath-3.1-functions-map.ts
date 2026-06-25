// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const mapFunctions: IFunctionDefinition[] = [
  {
    name: 'map:merge',
    displayName: 'Merge',
    description: 'Returns a map that combines the entries from a number of existing maps.',
    returnType: Types.Map,
    arguments: [
      {
        name: 'maps',
        displayName: '$maps',
        description: 'Maps',
        type: Types.Map,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'options', displayName: '$options', description: 'Options', type: Types.Map, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'map:keys',
    displayName: 'Keys',
    description: 'Returns a sequence containing all the keys present in a map',
    returnType: Types.AnyAtomicType,
    returnCollection: true,
    arguments: [{ name: 'map', displayName: '$map', description: 'Map', type: Types.Map, minOccurs: 1, maxOccurs: 1 }],
  },
  {
    name: 'map:contains',
    displayName: 'Contains',
    description: 'Tests whether a supplied map contains an entry for a given key',
    returnType: Types.Boolean,
    arguments: [
      { name: 'map', displayName: '$map', description: 'Map', type: Types.Map, minOccurs: 1, maxOccurs: 1 },
      { name: 'key', displayName: '$key', description: 'Key', type: Types.AnyAtomicType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'map:get',
    displayName: 'Get',
    description: 'Returns the value associated with a supplied key in a given map.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'map', displayName: '$map', description: 'Map', type: Types.Map, minOccurs: 1, maxOccurs: 1 },
      { name: 'key', displayName: '$key', description: 'Key', type: Types.AnyAtomicType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'map:find',
    displayName: 'Find',
    description:
      'Searches the supplied input sequence and any contained maps and arrays for a map entry with the supplied key, and returns the corresponding values.',
    returnType: Types.Array,
    arguments: [
      {
        name: 'input',
        displayName: '$input',
        description: 'Input',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'key', displayName: '$key', description: 'Key', type: Types.AnyAtomicType, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'map:put',
    displayName: 'Put',
    description:
      'Returns a map containing all the contents of the supplied map, but with an additional entry, which replaces any existing entry for the same key.',
    returnType: Types.Map,
    arguments: [
      { name: 'map', displayName: '$map', description: 'Map', type: Types.Map, minOccurs: 1, maxOccurs: 1 },
      { name: 'key', displayName: '$key', description: 'Key', type: Types.AnyAtomicType, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'value',
        displayName: '$value',
        description: 'Value',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'map:entry',
    displayName: 'Entry',
    description: 'Returns a map that contains a single entry (a key-value pair).',
    returnType: Types.Map,
    arguments: [
      { name: 'key', displayName: '$key', description: 'Key', type: Types.AnyAtomicType, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'value',
        displayName: '$value',
        description: 'Value',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'map:remove',
    displayName: 'Remove',
    description: 'Returns a map containing all the entries from a supplied map, except those having a specified key.',
    returnType: Types.Map,
    arguments: [
      { name: 'map', displayName: '$map', description: 'Map', type: Types.Map, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'keys',
        displayName: '$keys',
        description: 'Keys',
        type: Types.AnyAtomicType,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'map:for-each',
    displayName: 'For Each',
    description: 'Applies a supplied function to every entry in a map, returning the concatenation of the results.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'map', displayName: '$map', description: 'Map', type: Types.Map, minOccurs: 1, maxOccurs: 1 },
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
    name: 'map:size',
    displayName: 'Size',
    description: 'Returns the number of entries in the supplied map.',
    returnType: Types.Integer,
    arguments: [{ name: 'map', displayName: '$map', description: 'Map', type: Types.Map, minOccurs: 1, maxOccurs: 1 }],
  },
];
