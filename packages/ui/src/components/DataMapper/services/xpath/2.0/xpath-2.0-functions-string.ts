import { Types } from '../../../models/types';
import { IFunctionDefinition } from '../../../models/mapping';

/**
 * 7.4 String - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#string-value-functions
 */
export const stringFunctions = [
  {
    name: 'concat',
    displayName: 'Concatenate',
    description: 'Concatenates two or more xs:anyAtomicType arguments cast to xs:string.',
    returnType: Types.String,
    arguments: [
      {
        name: 'args',
        displayName: '$args',
        description: 'Arguments',
        type: Types.AnyAtomicType,
        minOccurs: 2,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'string-join',
    displayName: 'Concatenate with Delimiter',
    description:
      'Returns the xs:string produced by concatenating a sequence of xs:strings using an optional separator.',
    returnType: Types.String,
    arguments: [
      {
        name: 'arg1',
        displayName: '$arg1',
        description: 'Arguments',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'arg2',
        displayName: '$arg2',
        description: 'Separator',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'substring',
    displayName: 'Substring',
    description: 'Returns the xs:string located at a specified place within an argument xs:string.',
    returnType: Types.String,
    arguments: [
      {
        name: 'sourceString',
        displayName: '$sourceString',
        description: 'Source String',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'startingLoc',
        displayName: '$startingLoc',
        description: 'Starting Location',
        type: Types.Double,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'length',
        displayName: '$length',
        description: 'Length',
        type: Types.Double,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'string-length',
    displayName: 'String Length',
    description: 'Returns the length of the argument.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'normalize-space',
    displayName: 'Normalize Space',
    description: 'Returns the whitespace-normalized value of the argument.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'normalize-unicode',
    displayName: 'Normalize Unicode',
    description:
      'Returns the normalized value of the first argument in the normalization form specified by the second argument.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'normalizationForm',
        displayName: '$normalizationForm',
        description: 'Normalization Form',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'upper-case',
    displayName: 'Uppercase',
    description: 'Returns the upper-cased value of the argument.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'lower-case',
    displayName: 'Lowercase',
    description: 'Returns the lower-cased value of the argument.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'translate',
    displayName: 'Translate',
    description:
      'Returns the first xs:string argument with occurrences of characters contained in the second argument' +
      ' replaced by the character at the corresponding position in the third argument.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Argument', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'mapString',
        displayName: '$mapString',
        description: 'Map String',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'transString',
        displayName: '$transString',
        description: 'Translate String',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'encode-for-uri',
    displayName: 'Encode for URI',
    description:
      'Returns the xs:string argument with certain characters escaped to enable the resulting string to be used' +
      ' as a path segment in a URI.',
    returnType: Types.String,
    arguments: [
      {
        name: 'uri-part',
        displayName: '$uri-part',
        description: 'An URI part',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'iri-to-uri',
    displayName: 'IRI to URI',
    description:
      'Returns the xs:string argument with certain characters escaped to enable the resulting string to be used' +
      ' as (part of) a URI.',
    returnType: Types.String,
    arguments: [
      { name: 'iri', displayName: '$iri', description: 'IRI string', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'escape-html-uri',
    displayName: 'Escape HTML URI',
    description:
      'Returns the xs:string argument with certain characters escaped in the manner that html user agents handle' +
      ' attribute values that expect URIs.',
    returnType: Types.String,
    arguments: [
      { name: 'uri', displayName: '$uri', description: 'URI string', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
] as IFunctionDefinition[];

/**
 * 7.5 Substring Matching - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#substring.functions
 */
export const substringMatchingFunctions = [
  {
    name: 'contains',
    displayName: 'Contains',
    description: 'Indicates whether one xs:string contains another xs:string. A collation may be specified.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: '$arg1', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: '$arg2', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: '$collation',
        type: 'xs:string',
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'starts-with',
    displayName: 'Starts With',
    description:
      'Indicates whether the value of one xs:string begins with the collation units of another xs:string.' +
      ' A collation may be specified.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: '$arg1', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: '$arg2', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: '$collation',
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
      'Indicates whether the value of one xs:string ends with the collation units of another xs:string.' +
      ' A collation may be specified.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: '$arg1', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: '$arg2', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: '$collation',
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
      'Returns the collation units of one xs:string that precede in that xs:string the collation units of another' +
      ' xs:string. A collation may be specified.',
    returnType: Types.String,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: '$arg1', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: '$arg2', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: '$collation',
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
      'Returns the collation units of xs:string that follow in that xs:string the collation units of another' +
      ' xs:string. A collation may be specified.',
    returnType: Types.String,
    arguments: [
      { name: 'arg1', displayName: '$arg1', description: '$arg1', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      { name: 'arg2', displayName: '$arg2', description: '$arg2', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'collation',
        displayName: '$collation',
        description: '$collation',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
] as IFunctionDefinition[];

/**
 * 7.6 Pattern Matching - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#string.match
 */
export const patternMatchingFunctions = [
  {
    name: 'matches',
    displayName: 'Matches',
    description:
      'Returns an xs:boolean value that indicates whether the value of the first argument is matched by the' +
      ' regular expression that is the value of the second argument.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'input', displayName: '$input', description: '$input', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'pattern',
        displayName: '$pattern',
        description: '$pattern',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'flags',
        displayName: '$flags',
        description: '$flags',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'replace',
    displayName: 'Replace',
    description:
      'Returns the value of the first argument with every substring matched by the regular expression that is' +
      ' the value of the second argument replaced by the replacement string that is the value of the third argument.',
    returnType: Types.String,
    arguments: [
      { name: 'input', displayName: '$input', description: '$input', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'pattern',
        displayName: '$pattern',
        description: '$pattern',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'replacement',
        displayName: '$replacement',
        description: '$replacement',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'flags',
        displayName: '$flags',
        description: '$flags',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'tokenize',
    displayName: 'Tokenize',
    description:
      'Returns a sequence of one or more xs:strings whose values are substrings of the value of the first argument' +
      ' separated by substrings that match the regular expression that is the value of the second argument.',
    returnType: Types.String,
    returnCollection: true,
    arguments: [
      { name: 'input', displayName: '$input', description: '$input', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'pattern',
        displayName: '$pattern',
        description: '$pattern',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'flags',
        displayName: '$flags',
        description: '$flags',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
] as IFunctionDefinition[];
