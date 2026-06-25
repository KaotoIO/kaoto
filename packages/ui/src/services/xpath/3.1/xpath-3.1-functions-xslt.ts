// XSLT-defined functions from W3C XSLT 3.0 specification — hand-written
// Source: https://www.w3.org/TR/xslt-30/
// These functions are not in the XPath F&O function-catalog.xml;
// they are defined in XSLT and available in XPath expressions within stylesheets.
// See also: https://www.w3.org/TR/xpath-functions-31/#functions-defined-in-XSLT
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const xsltFunctions: IFunctionDefinition[] = [
  {
    name: 'current',
    displayName: 'Current',
    description:
      'Returns the item that was the context item at the point where the expression was invoked from the XSLT stylesheet.',
    returnType: Types.Item,
    arguments: [],
  },
  {
    name: 'current-group',
    displayName: 'Current Group',
    description: 'Returns the contents of the current group selected by xsl:for-each-group.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [],
  },
  {
    name: 'current-grouping-key',
    displayName: 'Current Grouping Key',
    description: 'Returns the grouping key of the current group within xsl:for-each-group.',
    returnType: Types.AnyAtomicType,
    returnCollection: true,
    arguments: [],
  },
  {
    name: 'key',
    displayName: 'Key',
    description: 'Returns the nodes that match a given key value, as defined by an xsl:key declaration.',
    returnType: Types.Node,
    returnCollection: true,
    arguments: [
      { name: 'name', displayName: '$name', description: 'Name', type: Types.String, minOccurs: 1, maxOccurs: 1 },
      {
        name: 'value',
        displayName: '$value',
        description: 'Value',
        type: Types.AnyAtomicType,
        minOccurs: 1,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      { name: 'top', displayName: '$top', description: 'Top', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'document',
    displayName: 'Document',
    description: 'Provides access to XML documents identified by a URI.',
    returnType: Types.Node,
    returnCollection: true,
    arguments: [
      {
        name: 'uri-sequence',
        displayName: '$uri-sequence',
        description: 'Uri Sequence',
        type: Types.Item,
        minOccurs: 1,
        maxOccurs: Number.MAX_SAFE_INTEGER,
      },
      {
        name: 'base-node',
        displayName: '$base-node',
        description: 'Base Node',
        type: Types.Node,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'regex-group',
    displayName: 'Regex Group',
    description:
      'Returns the substring captured by a parenthesized sub-expression of the regular expression used by xsl:analyze-string.',
    returnType: Types.String,
    arguments: [
      {
        name: 'group-number',
        displayName: '$group-number',
        description: 'Group Number',
        type: Types.Integer,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'current-merge-group',
    displayName: 'Current Merge Group',
    description:
      'Returns the items within the current merge group that share the same merge key value, within xsl:merge.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      {
        name: 'source',
        displayName: '$source',
        description: 'Source',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'current-merge-key',
    displayName: 'Current Merge Key',
    description: 'Returns the merge key value shared by all items in the current merge group, within xsl:merge.',
    returnType: Types.AnyAtomicType,
    returnCollection: true,
    arguments: [],
  },
  {
    name: 'accumulator-before',
    displayName: 'Accumulator Before',
    description: 'Returns the value of the named accumulator before processing the context node.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'name', displayName: '$name', description: 'Name', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'accumulator-after',
    displayName: 'Accumulator After',
    description: 'Returns the value of the named accumulator after processing the context node and its descendants.',
    returnType: Types.Item,
    returnCollection: true,
    arguments: [
      { name: 'name', displayName: '$name', description: 'Name', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'current-output-uri',
    displayName: 'Current Output Uri',
    description: 'Returns the URI of the current output destination being written to by xsl:result-document.',
    returnType: Types.AnyURI,
    arguments: [],
  },
];
