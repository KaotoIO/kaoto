import { Types } from '../../../models/types';
import { IFunctionDefinition } from '../../../models/mapping';

/**
 * 14 Node - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#node-functions
 */
export const nodeFunctions = [
  {
    name: 'name',
    displayName: 'Name',
    description: 'Returns the name of the context node or the specified node as an xs:string.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'local-name',
    displayName: 'Local Name',
    description: 'Returns the local name of the context node or the specified node as an xs:NCName.',
  },
  {
    name: 'namespace-uri',
    displayName: 'Namespace URI',
    description:
      'Returns the namespace URI as an xs:anyURI for the xs:QName of the argument node or the context node if' +
      ' the argument is omitted. This may be the URI corresponding to the zero-length string if the xs:QName' +
      ' is in no namespace.',
    returnType: Types.String,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'number',
    displayName: 'Number',
    description:
      'Returns the value of the context item after atomization or the specified argument converted to an xs:double.',
    returnType: Types.Double,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.AnyAtomicType, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'lang',
    displayName: 'Lang',
    description:
      'Returns true or false, depending on whether the language of the given node or the context node, as defined' +
      ' using the xml:lang attribute, is the same as, or a sublanguage of, the language specified by the argument.',
    returnType: Types.Boolean,
    arguments: [
      {
        name: 'testlarg',
        displayName: '$testlang',
        description: '$testlang',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'node',
        displayName: '$node',
        description: '$node',
        type: Types.Node,
        minOccurs: 0,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'root',
    displayName: 'Root',
    description: 'Returns the root of the tree to which the node argument belongs.',
    returnType: Types.Node,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.Node, minOccurs: 0, maxOccurs: 1 },
    ],
  },
] as IFunctionDefinition[];
