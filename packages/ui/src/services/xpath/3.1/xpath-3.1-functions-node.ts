// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const nodeFunctions: IFunctionDefinition[] = [
  {
    name: 'node-name',
    displayName: 'Node Name',
    description: 'Returns the name of a node, as an xs:QName.',
    returnType: Types.QName,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'nilled',
    displayName: 'Nilled',
    description: 'Returns true for an element that is nilled.',
    returnType: Types.Boolean,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'string',
    displayName: 'String',
    description: 'Returns the value of $arg represented as an xs:string.',
    returnType: Types.String,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Item, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'data',
    displayName: 'Data',
    description:
      'Returns the result of atomizing a sequence. This process flattens arrays, and replaces nodes by their typed values.',
    returnType: Types.AnyAtomicType,
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
    name: 'base-uri',
    displayName: 'Base Uri',
    description: 'Returns the base URI of a node.',
    returnType: Types.AnyURI,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'document-uri',
    displayName: 'Document Uri',
    description: 'Returns the URI of a resource where a document can be found, if available.',
    returnType: Types.AnyURI,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'name',
    displayName: 'Name',
    description:
      'Returns the name of a node, as an xs:string that is either the zero-length string, or has the lexical form of an xs:QName.',
    returnType: Types.String,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'local-name',
    displayName: 'Local Name',
    description:
      'Returns the local part of the name of $arg as an xs:string that is either the zero-length string, or has the lexical form of an xs:NCName.',
    returnType: Types.String,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'namespace-uri',
    displayName: 'Namespace Uri',
    description: 'Returns the namespace URI part of the name of $arg, as an xs:anyURI value.',
    returnType: Types.AnyURI,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'lang',
    displayName: 'Lang',
    description:
      'This function tests whether the language of $node, or the context item if the second argument is omitted, as specified by xml:lang attributes is the same as, or is a sublanguage of, the language specified by $testlang.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'testlang',
        displayName: '$testlang',
        description: 'Testlang',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      { name: 'node', displayName: '$node', description: 'Node', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'path',
    displayName: 'Path',
    description:
      'Returns a path expression that can be used to select the supplied node relative to the root of its containing document.',
    returnType: Types.String,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'root',
    displayName: 'Root',
    description:
      'Returns the root of the tree to which $arg belongs. This will usually, but not necessarily, be a document node.',
    returnType: Types.Node,
    arguments: [{ name: 'arg', displayName: '$arg', description: 'Arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 }],
  },
  {
    name: 'has-children',
    displayName: 'Has Children',
    description: 'Returns true if the supplied node has one or more child nodes (of any kind).',
    returnType: Types.Boolean,
    arguments: [
      { name: 'node', displayName: '$node', description: 'Node', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'innermost',
    displayName: 'Innermost',
    description:
      'Returns every node within the input sequence that is not an ancestor of another member of the input sequence; the nodes are returned in document order with duplicates eliminated.',
    returnType: Types.Node,
    returnCollection: true,
    arguments: [
      {
        name: 'nodes',
        displayName: '$nodes',
        description: 'Nodes',
        type: Types.Node,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
  {
    name: 'outermost',
    displayName: 'Outermost',
    description:
      'Returns every node within the input sequence that has no ancestor that is itself a member of the input sequence; the nodes are returned in document order with duplicates eliminated.',
    returnType: Types.Node,
    returnCollection: true,
    arguments: [
      {
        name: 'nodes',
        displayName: '$nodes',
        description: 'Nodes',
        type: Types.Node,
        minOccurs: 0,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
    ],
  },
];
