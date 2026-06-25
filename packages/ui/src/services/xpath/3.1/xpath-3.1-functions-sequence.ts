// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const sequenceFunctions: IFunctionDefinition[] = [
  {
    name: 'index-of',
    displayName: 'Index Of',
    description:
      'Returns a sequence of positive integers giving the positions within the sequence $seq of items that are equal to $search.',
    returnType: Types.Integer,
    returnCollection: true,
    arguments: [
      {
        name: 'seq',
        displayName: '$seq',
        description: 'Seq',
        type: Types.AnyAtomicType,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'search',
        displayName: '$search',
        description: 'Search',
        type: Types.AnyAtomicType,
        minOccurs: 1,
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
    name: 'empty',
    displayName: 'Empty',
    description: 'Returns true if the argument is the empty sequence.',
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
    name: 'exists',
    displayName: 'Exists',
    description: 'Returns true if the argument is a non-empty sequence.',
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
    name: 'distinct-values',
    displayName: 'Distinct Values',
    description: 'Returns the values that appear in a sequence, with duplicates eliminated.',
    returnType: Types.AnyAtomicType,
    returnCollection: true,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.AnyAtomicType,
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
    ],
  },
  {
    name: 'insert-before',
    displayName: 'Insert Before',
    description:
      'Returns a sequence constructed by inserting an item or a sequence of items at a given position within an existing sequence.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'target',
        displayName: '$target',
        description: 'Target',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'position',
        displayName: '$position',
        description: 'Position',
        type: Types.Integer,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'inserts',
        displayName: '$inserts',
        description: 'Inserts',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'remove',
    displayName: 'Remove',
    description: 'Returns a new sequence containing all the items of $target except the item at position $position.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'target',
        displayName: '$target',
        description: 'Target',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
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
    name: 'head',
    displayName: 'Head',
    description: 'Returns the first item in a sequence.',
    returnType: Types.Item,
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
    name: 'tail',
    displayName: 'Tail',
    description: 'Returns all but the first item in a sequence.',
    returnType: Types.Item,
    returnCollection: true,
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
    name: 'reverse',
    displayName: 'Reverse',
    description: 'Reverses the order of items in a sequence.',
    returnType: Types.Item,
    returnCollection: true,
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
    name: 'subsequence',
    displayName: 'Subsequence',
    description:
      'Returns the contiguous sequence of items in the value of $sourceSeq beginning at the position indicated by the value of $startingLoc and continuing for the number of items indicated by the value of $length.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'sourceSeq',
        displayName: '$sourceSeq',
        description: 'SourceSeq',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'startingLoc',
        displayName: '$startingLoc',
        description: 'StartingLoc',
        type: Types.Double,
        minOccurs: 1,
        maxOccurs: 1,
      },
      { name: 'length', displayName: '$length', description: 'Length', type: Types.Double, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'unordered',
    displayName: 'Unordered',
    description: 'Returns the items of $sourceSeq in an implementation-dependent order.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'sourceSeq',
        displayName: '$sourceSeq',
        description: 'SourceSeq',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'zero-or-one',
    displayName: 'Zero Or One',
    description: 'Returns $arg if it contains zero or one items. Otherwise, raises an error.',
    returnType: Types.Item,
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
    name: 'one-or-more',
    displayName: 'One Or More',
    description: 'Returns $arg if it contains one or more items. Otherwise, raises an error.',
    returnType: Types.Item,
    returnCollection: true,
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
    name: 'exactly-one',
    displayName: 'Exactly One',
    description: 'Returns $arg if it contains exactly one item. Otherwise, raises an error.',
    returnType: Types.Item,
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
    name: 'deep-equal',
    displayName: 'Deep Equal',
    description:
      'This function assesses whether two sequences are deep-equal to each other. To be deep-equal, they must contain items that are pairwise deep-equal; and for two items to be deep-equal, they must either be atomic values that compare equal, or nodes of the same kind, with the same name, whose children are deep-equal, or maps with matching entries, or arrays with matching members.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'parameter1',
        displayName: '$parameter1',
        description: 'Parameter1',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'parameter2',
        displayName: '$parameter2',
        description: 'Parameter2',
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
    ],
  },
  {
    name: 'count',
    displayName: 'Count',
    description: 'Returns the number of items in a sequence.',
    returnType: Types.Integer,
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
    name: 'avg',
    displayName: 'Avg',
    description:
      'Returns the average of the values in the input sequence $arg, that is, the sum of the values divided by the number of values.',
    returnType: Types.AnyAtomicType,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.AnyAtomicType,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'max',
    displayName: 'Max',
    description: 'Returns a value that is equal to the highest value appearing in the input sequence.',
    returnType: Types.AnyAtomicType,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.AnyAtomicType,
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
    ],
  },
  {
    name: 'min',
    displayName: 'Min',
    description: 'Returns a value that is equal to the lowest value appearing in the input sequence.',
    returnType: Types.AnyAtomicType,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.AnyAtomicType,
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
    ],
  },
  {
    name: 'sum',
    displayName: 'Sum',
    description: 'Returns a value obtained by adding together the values in $arg.',
    returnType: Types.AnyAtomicType,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.AnyAtomicType,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'zero',
        displayName: '$zero',
        description: 'Zero',
        type: Types.AnyAtomicType,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'id',
    displayName: 'Id',
    description:
      'Returns the sequence of element nodes that have an ID value matching the value of one or more of the IDREF values supplied in $arg.',
    returnType: Types.Element,
    returnCollection: true,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'node', displayName: '$node', description: 'Node', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'element-with-id',
    displayName: 'Element With Id',
    description:
      'Returns the sequence of element nodes that have an ID value matching the value of one or more of the IDREF values supplied in $arg.',
    returnType: Types.Element,
    returnCollection: true,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'node', displayName: '$node', description: 'Node', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'idref',
    displayName: 'Idref',
    description:
      'Returns the sequence of element or attribute nodes with an IDREF value matching the value of one or more of the ID values supplied in $arg.',
    returnType: Types.Node,
    returnCollection: true,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'node', displayName: '$node', description: 'Node', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'doc',
    displayName: 'Doc',
    description:
      'Retrieves a document using a URI supplied as an xs:string, and returns the corresponding document node.',
    returnType: Types.DocumentNode,
    arguments: [
      { name: 'uri', displayName: '$uri', description: 'Uri', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'doc-available',
    displayName: 'Doc Available',
    description:
      'The function returns true if and only if the function call fn:doc($uri) would return a document node.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'uri', displayName: '$uri', description: 'Uri', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'collection',
    displayName: 'Collection',
    description:
      'Returns a sequence of items identified by a collection URI; or a default collection if no URI is supplied.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'uri-collection',
    displayName: 'Uri Collection',
    description: 'Returns a sequence of xs:anyURI values representing the URIs in a URI collection.',
    returnType: Types.AnyURI,
    returnCollection: true,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'unparsed-text',
    displayName: 'Unparsed Text',
    description:
      'The fn:unparsed-text function reads an external resource (for example, a file) and returns a string representation of the resource.',
    returnType: Types.String,
    arguments: [
      { name: 'href', displayName: '$href', description: 'Href', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'encoding',
        displayName: '$encoding',
        description: 'Encoding',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'unparsed-text-lines',
    displayName: 'Unparsed Text Lines',
    description:
      'The fn:unparsed-text-lines function reads an external resource (for example, a file) and returns its contents as a sequence of strings, one for each line of text in the string representation of the resource.',
    returnType: Types.String,
    returnCollection: true,
    arguments: [
      { name: 'href', displayName: '$href', description: 'Href', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'encoding',
        displayName: '$encoding',
        description: 'Encoding',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'unparsed-text-available',
    displayName: 'Unparsed Text Available',
    description:
      'Because errors in evaluating the fn:unparsed-text function are non-recoverable, these two functions are provided to allow an application to determine whether a call with particular arguments would succeed.',
    returnType: Types.Boolean,
    arguments: [
      { name: 'href', displayName: '$href', description: 'Href', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'encoding',
        displayName: '$encoding',
        description: 'Encoding',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'environment-variable',
    displayName: 'Environment Variable',
    description: 'Returns the value of a system environment variable, if it exists.',
    returnType: Types.String,
    arguments: [
      { name: 'name', displayName: '$name', description: 'Name', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'available-environment-variables',
    displayName: 'Available Environment Variables',
    description:
      'Returns a list of environment variable names that are suitable for passing to fn:environment-variable, as a (possibly empty) sequence of strings.',
    returnType: Types.String,
    returnCollection: true,
    arguments: [],
  },
  {
    name: 'generate-id',
    displayName: 'Generate Id',
    description: 'This function returns a string that uniquely identifies a given node.',
    returnType: Types.String,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'parse-xml',
    displayName: 'Parse Xml',
    description:
      'This function takes as input an XML document represented as a string, and returns the document node at the root of an XDM tree representing the parsed document.',
    returnType: Types.Item,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'parse-xml-fragment',
    displayName: 'Parse Xml Fragment',
    description:
      'This function takes as input an XML external entity represented as a string, and returns the document node at the root of an XDM tree representing the parsed document fragment.',
    returnType: Types.DocumentNode,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.String, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'serialize',
    displayName: 'Serialize',
    description:
      'This function serializes the supplied input sequence $arg as described in , returning the serialized representation of the sequence as a string.',
    returnType: Types.String,
    arguments: [
      {
        name: 'arg',
        displayName: '$arg',
        description: 'Arg',
        type: Types.Item,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'params', displayName: '$params', description: 'Params', type: Types.Item, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'json-to-xml',
    displayName: 'Json To Xml',
    description:
      'Parses a string supplied in the form of a JSON text, returning the results in the form of an XML document node.',
    returnType: Types.DocumentNode,
    arguments: [
      {
        name: 'json-text',
        displayName: '$json-text',
        description: 'Json Text',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'options', displayName: '$options', description: 'Options', type: Types.Map, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'xml-to-json',
    displayName: 'Xml To Json',
    description:
      'Converts an XML tree, whose format corresponds to the XML representation of JSON defined in this specification, into a string conforming to the JSON grammar.',
    returnType: Types.String,
    arguments: [
      { name: 'input', displayName: '$input', description: 'Input', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
      { name: 'options', displayName: '$options', description: 'Options', type: Types.Map, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'parse-json',
    displayName: 'Parse Json',
    description:
      'Parses a string supplied in the form of a JSON text, returning the results typically in the form of a map or array.',
    returnType: Types.Item,
    arguments: [
      {
        name: 'json-text',
        displayName: '$json-text',
        description: 'Json Text',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'options', displayName: '$options', description: 'Options', type: Types.Map, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'json-doc',
    displayName: 'Json Doc',
    description: 'Reads an external resource containing JSON, and returns the result of parsing the resource as JSON.',
    returnType: Types.Item,
    arguments: [
      { name: 'href', displayName: '$href', description: 'Href', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      { name: 'options', displayName: '$options', description: 'Options', type: Types.Map, minOccurs: 0, maxOccurs: 1 },
    ],
  },
];
