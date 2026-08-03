import { XPathFunction } from '@kaoto/camel-catalog/types';

import { Types } from '../../../models/datamapper/types';
import { FunctionGroup } from '../xpath-model';
import { XPathCatalogConverter } from './xpath-catalog-converter';

describe('XPathCatalogConverter.mapXPathTypeToTypes', () => {
  it.each([
    ['xs:string', Types.String],
    ['xs:boolean', Types.Boolean],
    ['xs:integer', Types.Integer],
    ['xs:decimal', Types.Decimal],
    ['xs:double', Types.Double],
    ['xs:float', Types.Float],
    ['xs:numeric', Types.Numeric],
    ['xs:date', Types.Date],
    ['xs:dateTime', Types.DateTime],
    ['xs:dateTimeStamp', Types.DateTime],
    ['xs:time', Types.Time],
    ['xs:duration', Types.Duration],
    ['xs:dayTimeDuration', Types.DayTimeDuration],
    ['xs:anyAtomicType', Types.AnyAtomicType],
    ['xs:anyType', Types.AnyType],
    ['xs:anyURI', Types.AnyURI],
    ['xs:QName', Types.QName],
    ['xs:NCName', Types.NCName],
    ['xs:language', Types.String],
    ['xs:base64Binary', Types.AnyAtomicType],
    ['xs:positiveInteger', Types.PositiveInteger],
    ['item()', Types.Item],
    ['node()', Types.Node],
    ['element()', Types.Element],
    ['document-node()', Types.DocumentNode],
    ['none', Types.Item],
  ])('should map %s to %s', (input, expected) => {
    expect(XPathCatalogConverter.mapXPathTypeToTypes(input)).toBe(expected);
  });

  it('should strip cardinality suffixes', () => {
    expect(XPathCatalogConverter.mapXPathTypeToTypes('xs:string?')).toBe(Types.String);
    expect(XPathCatalogConverter.mapXPathTypeToTypes('item()*')).toBe(Types.Item);
    expect(XPathCatalogConverter.mapXPathTypeToTypes('node()+')).toBe(Types.Node);
  });

  it('should handle complex types as Item', () => {
    expect(XPathCatalogConverter.mapXPathTypeToTypes('map(*)')).toBe(Types.Item);
    expect(XPathCatalogConverter.mapXPathTypeToTypes('map(xs:string, item())')).toBe(Types.Item);
    expect(XPathCatalogConverter.mapXPathTypeToTypes('array(*)')).toBe(Types.Item);
    expect(XPathCatalogConverter.mapXPathTypeToTypes('function(*)')).toBe(Types.Item);
  });

  it('should handle typed element/document-node', () => {
    expect(XPathCatalogConverter.mapXPathTypeToTypes('element(fn:analyze-string-result)')).toBe(Types.Element);
    expect(XPathCatalogConverter.mapXPathTypeToTypes('document-node(element(*))')).toBe(Types.DocumentNode);
  });

  it('should default unknown types to Item', () => {
    expect(XPathCatalogConverter.mapXPathTypeToTypes('unknown-type')).toBe(Types.Item);
  });
});

describe('XPathCatalogConverter.convertCatalog', () => {
  const sampleCatalog: Record<string, Record<string, XPathFunction>> = {
    _metadata: { fieldSemantics: {} } as never,
    namespaces: { fn: 'http://www.w3.org/2005/xpath-functions' } as never,
    String: {
      concat: {
        name: 'concat',
        displayName: 'Concatenate',
        description: 'Returns the concatenation of the string values of the arguments.',
        returnType: 'xs:string',
        returnCollection: false,
        arguments: [
          {
            name: 'args',
            type: 'xs:anyAtomicType',
            displayName: '$args',
            description: 'Arguments',
            minOccurs: 2,
            maxOccurs: 2147483647,
            cardinality: '',
            usage: '',
            default: '',
          },
        ],
        prefix: 'fn',
        returnCardinality: '',
        signatures: [],
      },
    },
    XSLT: {
      'current-group': {
        name: 'current-group',
        displayName: 'Current Group',
        description: 'Returns the contents of the current group selected by xsl:for-each-group.',
        returnType: 'item()',
        returnCollection: true,
        arguments: [],
        prefix: 'fn',
        returnCardinality: '*',
        signatures: [],
      },
      'current-grouping-key': {
        name: 'current-grouping-key',
        displayName: 'Current Grouping Key',
        description: 'Returns the grouping key of the current group within xsl:for-each-group.',
        returnType: 'xs:anyAtomicType',
        returnCollection: true,
        arguments: [],
        prefix: 'fn',
        returnCardinality: '*',
        signatures: [],
      },
    },
    MapFunctions: {
      'map:contains': {
        name: 'map:contains',
        displayName: 'Map Contains',
        description: 'Tests whether a supplied map contains an entry for a given key.',
        returnType: 'xs:boolean',
        returnCollection: false,
        arguments: [
          {
            name: 'map',
            type: 'map(*)',
            displayName: '$map',
            description: 'The map',
            minOccurs: 1,
            maxOccurs: 1,
            cardinality: '',
            usage: '',
            default: '',
          },
          {
            name: 'key',
            type: 'xs:anyAtomicType',
            displayName: '$key',
            description: 'The key',
            minOccurs: 1,
            maxOccurs: 1,
            cardinality: '',
            usage: '',
            default: '',
          },
        ],
        prefix: 'map',
        returnCardinality: '',
        signatures: [],
      },
    },
    Math: {
      'math:sin': {
        name: 'math:sin',
        displayName: 'Sine',
        description: 'Returns the sine of the argument.',
        returnType: 'xs:double',
        returnCollection: false,
        arguments: [
          {
            name: 'theta',
            type: 'xs:double',
            displayName: '$theta',
            description: 'The angle in radians',
            minOccurs: 0,
            maxOccurs: 1,
            cardinality: '?',
            usage: '',
            default: '',
          },
        ],
        prefix: 'math',
        returnCardinality: '?',
        signatures: [],
      },
    },
  };

  it('should skip _metadata and namespaces', () => {
    const result = XPathCatalogConverter.convertCatalog(sampleCatalog);
    expect(Object.keys(result)).not.toContain('_metadata');
    expect(Object.keys(result)).not.toContain('namespaces');
  });

  it('should convert categories to FunctionGroup keys', () => {
    const result = XPathCatalogConverter.convertCatalog(sampleCatalog);
    expect(result[FunctionGroup.String]).toBeDefined();
    expect(result[FunctionGroup.XSLT]).toBeDefined();
    expect(result[FunctionGroup.Map]).toBeDefined();
    expect(result[FunctionGroup.Math]).toBeDefined();
  });

  it('should map MapFunctions category to FunctionGroup.Map', () => {
    const result = XPathCatalogConverter.convertCatalog(sampleCatalog);
    expect(result[FunctionGroup.Map]).toHaveLength(1);
    expect(result[FunctionGroup.Map]![0].name).toBe('map:contains');
  });

  it('should convert function definitions correctly', () => {
    const result = XPathCatalogConverter.convertCatalog(sampleCatalog);
    const concat = result[FunctionGroup.String]![0];
    expect(concat.name).toBe('concat');
    expect(concat.displayName).toBe('Concatenate');
    expect(concat.returnType).toBe(Types.String);
    expect(concat.arguments).toHaveLength(1);
    expect(concat.arguments[0].type).toBe(Types.AnyAtomicType);
    expect(concat.arguments[0].maxOccurs).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('should include current-group and current-grouping-key in XSLT group', () => {
    const result = XPathCatalogConverter.convertCatalog(sampleCatalog);
    const xsltFunctions = result[FunctionGroup.XSLT]!;
    expect(xsltFunctions).toHaveLength(2);
    const names = xsltFunctions.map((f) => f.name);
    expect(names).toContain('current-group');
    expect(names).toContain('current-grouping-key');
  });

  it('should set returnCollection on functions that return collections', () => {
    const result = XPathCatalogConverter.convertCatalog(sampleCatalog);
    const currentGroup = result[FunctionGroup.XSLT]!.find((f) => f.name === 'current-group')!;
    expect(currentGroup.returnCollection).toBe(true);
    const concat = result[FunctionGroup.String]![0];
    expect(concat.returnCollection).toBeUndefined();
  });

  it('should convert argument types', () => {
    const result = XPathCatalogConverter.convertCatalog(sampleCatalog);
    const mapContains = result[FunctionGroup.Map]![0];
    expect(mapContains.arguments[0].type).toBe(Types.Item);
    expect(mapContains.arguments[1].type).toBe(Types.AnyAtomicType);
  });

  it('should handle empty catalog', () => {
    const result = XPathCatalogConverter.convertCatalog({});
    expect(result).toEqual({});
  });

  it('should skip unknown category keys', () => {
    const result = XPathCatalogConverter.convertCatalog({
      UnknownCategory: {
        'some-func': {
          name: 'some-func',
          displayName: 'Some Func',
          description: 'desc',
          returnType: 'xs:string',
          returnCollection: false,
          arguments: [],
          prefix: 'fn',
          returnCardinality: '',
          signatures: [],
        },
      },
    });
    expect(Object.keys(result)).toHaveLength(0);
  });
});
