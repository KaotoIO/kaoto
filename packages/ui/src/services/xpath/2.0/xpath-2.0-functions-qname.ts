import { Types } from '../../../models/types';
import { IFunctionDefinition } from '../../../models/mapping';

/**
 * 11 QName - https://www.w3.org/TR/2010/REC-xpath-functions-20101214/#QName-funcs
 */
export const qnameFunctions = [
  {
    name: 'resolve-QName',
    displayName: 'Resolve QName',
    description:
      'Returns an xs:QName with the lexical form given in the first argument. The prefix is resolved using the' +
      ' in-scope namespaces for a given element.',
    returnType: Types.QName,
    arguments: [
      { name: 'qname', displayName: '$qname', description: '$qname', type: Types.String, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'QName',
    displayName: 'QName',
    description:
      'Returns an xs:QName with the namespace URI given in the first argument and the local name and prefix in' +
      ' the second argument.',
    returnType: Types.QName,
    arguments: [
      {
        name: 'paramURI',
        displayName: '$paramURI',
        description: '$paramURI',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'paramQName',
        displayName: '$paramQName',
        description: '$paramQName',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'prefix-from-QName',
    displayName: 'Prefix From QName',
    description: 'Returns an xs:NCName representing the prefix of the xs:QName argument.',
    returnType: Types.NCName,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.QName, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'local-name-from-QName',
    displayName: 'Local Name From QName',
    description: 'Returns an xs:NCName representing the local name of the xs:QName argument.',
    returnType: Types.NCName,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.QName, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'namespace-uri--from-QName',
    displayName: 'Namespace URI From QName',
    description:
      'Returns the namespace URI for the xs:QName argument. If the xs:QName is in no namespace, the zero-length' +
      ' string is returned.',
    returnType: Types.AnyURI,
    arguments: [
      { name: 'arg', displayName: '$arg', description: '$arg', type: Types.QName, minOccurs: 1, maxOccurs: 1 },
    ],
  },
  {
    name: 'namespace-uri-for-prefix',
    displayName: 'Namespace URI For Prefix',
    description:
      'Returns the namespace URI of one of the in-scope namespaces for the given element,' +
      ' identified by its namespace prefix.',
    returnType: Types.AnyURI,
    arguments: [
      {
        name: 'prefix',
        displayName: '$prefix',
        description: '$prefix',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
      {
        name: 'element',
        displayName: '$element',
        description: '$element',
        type: Types.Element,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'in-scope-prefixes',
    displayName: 'In Scope Prefixes',
    description: 'Returns the prefixes of the in-scope namespaces for the given element.',
    returnType: Types.String,
    returnCollection: true,
    arguments: [
      {
        name: 'element',
        displayName: '$element',
        description: '$element',
        type: Types.Element,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
] as IFunctionDefinition[];
