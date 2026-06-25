// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const stringFunctions: IFunctionDefinition[] = [
  {
    name: 'codepoints-to-string',
    displayName: 'Codepoints To String',
    description: 'Returns an xs:string whose characters have supplied codepoints.',
    returnType: Types.String,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.Integer,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'string-to-codepoints',
    displayName: 'String To Codepoints',
    description: 'Returns the sequence of codepoints that constitute an xs:string value.',
    returnType: Types.Integer,
    returnCollection: true,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'compare',
    displayName: 'Compare',
    description:
      'Returns -1, 0, or 1, depending on whether $comparand1 collates before, equal to, or after $comparand2 according to the rules of a selected collation.',
    returnType: Types.Integer,
    arguments: [
      {
        name: 'comparand1',
        displayName: '$comparand1',
        description: 'Comparand1',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      {
        name: 'comparand2',
        displayName: '$comparand2',
        description: 'Comparand2',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
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
    name: 'codepoint-equal',
    displayName: 'Codepoint Equal',
    description: 'Returns true if two strings are equal, considered codepoint-by-codepoint.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'comparand1',
        displayName: '$comparand1',
        description: 'Comparand1',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      {
        name: 'comparand2',
        displayName: '$comparand2',
        description: 'Comparand2',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'concat',
    displayName: 'Concatenate',
    description: 'Returns the concatenation of the string values of the arguments.',
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
    displayName: 'String Join',
    description:
      'Returns a string created by concatenating the items in a sequence, with a defined separator between adjacent items.',
    returnType: Types.String,
    arguments: [
      {
        name: 'arg1',
        displayName: '$arg1',
        description: 'Arg1',
        type: Types.AnyAtomicType,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'arg2', displayName: '$arg2', description: 'Arg2', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'substring',
    displayName: 'Substring',
    description:
      'Returns the portion of the value of $sourceString beginning at the position indicated by the value of $start and continuing for the number of characters indicated by the value of $length.',
    returnType: Types.String,
    arguments: [
      {
        name: 'sourceString',
        displayName: '$sourceString',
        description: 'SourceString',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'start', displayName: '$start', description: 'Start', type: Types.Double, minOccurs: 1, maxOccurs: 1 },
      { name: 'length', displayName: '$length', description: 'Length', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'string-length',
    displayName: 'String Length',
    description: 'Returns the number of characters in a string.',
    returnType: Types.Integer,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'normalize-space',
    displayName: 'Normalize Space',
    description:
      'Returns the value of $arg with leading and trailing whitespace removed, and sequences of internal whitespace reduced to a single space character.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'normalize-unicode',
    displayName: 'Normalize Unicode',
    description: 'Returns the value of $arg after applying Unicode normalization.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'normalizationForm',
        displayName: '$normalizationForm',
        description: 'NormalizationForm',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'upper-case',
    displayName: 'Upper Case',
    description: 'Converts a string to upper case.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'lower-case',
    displayName: 'Lower Case',
    description: 'Converts a string to lower case.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'translate',
    displayName: 'Translate',
    description: 'Returns the value of $arg modified by replacing or removing individual characters.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'mapString',
        displayName: '$mapString',
        description: 'MapString',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'transString',
        displayName: '$transString',
        description: 'TransString',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'encode-for-uri',
    displayName: 'Encode For Uri',
    description: 'Encodes reserved characters in a string that is intended to be used in the path segment of a URI.',
    returnType: Types.String,
    arguments: [
      {
        name: 'uri-part',
        displayName: '$uri-part',
        description: 'Uri Part',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'iri-to-uri',
    displayName: 'Iri To Uri',
    description: 'Converts a string containing an IRI into a URI according to the rules of .',
    returnType: Types.String,
    arguments: [
      { name: 'iri', displayName: '$iri', description: 'Iri', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'escape-html-uri',
    displayName: 'Escape Html Uri',
    description:
      'Escapes a URI in the same way that HTML user agents handle attribute values expected to contain URIs.',
    returnType: Types.String,
    arguments: [
      { name: 'uri', displayName: '$uri', description: 'Uri', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'contains-token',
    displayName: 'Contains Token',
    description:
      'Determines whether or not any of the supplied strings, when tokenized at whitespace boundaries, contains the supplied token, under the rules of the supplied collation.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'input',
        displayName: '$input',
        description: 'Input',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'token', displayName: '$token', description: 'Token', type: Types.String, minOccurs: 1, maxOccurs: 1 },
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
    name: 'resolve-uri',
    displayName: 'Resolve Uri',
    description: 'Resolves a relative IRI reference against an absolute IRI.',
    returnType: Types.AnyURI,
    arguments: [
      {
        name: 'relative',
        displayName: '$relative',
        description: 'Relative',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'base', displayName: '$base', description: 'Base', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'collation-key',
    displayName: 'Collation Key',
    description:
      'Given a string value and a collation, generates an internal value called a collation key, with the property that the matching and ordering of collation keys reflects the matching and ordering of strings under the specified collation.',
    returnType: Types.String,
    arguments: [
      { name: 'key', displayName: '$key', description: 'Key', type: Types.String, minOccurs: 1, maxOccurs: 1 },
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
