// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: https://www.w3.org/TR/xpath-functions-31/function-catalog.xml
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const qnameFunctions: IFunctionDefinition[] = [
  {
    name: 'resolve-QName',
    displayName: 'Resolve QName',
    description:
      'Returns an xs:QName value (that is, an expanded-QName) by taking an xs:string that has the lexical form of an xs:QName (a string in the form "prefix:local-name" or "local-name") and resolving it using the in-scope namespaces for a given element.',
    returnType: Types.QName,
    arguments: [
      { name: 'qname', displayName: '$qname', description: 'Qname', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'element',
        displayName: '$element',
        description: 'Element',
        type: Types.Element,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'QName',
    displayName: 'QName',
    description: 'Returns an xs:QName value formed using a supplied namespace URI and lexical QName.',
    returnType: Types.QName,
    arguments: [
      {
        name: 'paramURI',
        displayName: '$paramURI',
        description: 'ParamURI',
        type: Types.String,
        minOccurs: 0,
        maxOccurs: 1,
      },
      {
        name: 'paramQName',
        displayName: '$paramQName',
        description: 'ParamQName',
        type: Types.String,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'prefix-from-QName',
    displayName: 'Prefix From QName',
    description: 'Returns the prefix component of the supplied QName.',
    returnType: Types.NCName,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.QName, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'local-name-from-QName',
    displayName: 'Local Name From QName',
    description: 'Returns the local part of the supplied QName.',
    returnType: Types.NCName,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.QName, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'namespace-uri-from-QName',
    displayName: 'Namespace Uri From QName',
    description: 'Returns the namespace URI part of the supplied QName.',
    returnType: Types.AnyURI,
    arguments: [
      { name: 'arg', displayName: '$arg', description: 'Arg', type: Types.QName, minOccurs: 0, maxOccurs: 1 },
    ],
  },
  {
    name: 'namespace-uri-for-prefix',
    displayName: 'Namespace Uri For Prefix',
    description:
      'Returns the namespace URI of one of the in-scope namespaces for $element, identified by its namespace prefix.',
    returnType: Types.AnyURI,
    arguments: [
      { name: 'prefix', displayName: '$prefix', description: 'Prefix', type: Types.String, minOccurs: 0, maxOccurs: 1 },
      {
        name: 'element',
        displayName: '$element',
        description: 'Element',
        type: Types.Element,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
  {
    name: 'in-scope-prefixes',
    displayName: 'In Scope Prefixes',
    description: 'Returns the prefixes of the in-scope namespaces for an element node.',
    returnType: Types.String,
    returnCollection: true,
    arguments: [
      {
        name: 'element',
        displayName: '$element',
        description: 'Element',
        type: Types.Element,
        minOccurs: 1,
        maxOccurs: 1,
      },
    ],
  },
];
