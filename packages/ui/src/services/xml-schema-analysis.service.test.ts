import { XmlSchemaAnalysisService } from './xml-schema-analysis.service';

describe('XmlSchemaAnalysisService', () => {
  const makeSchema = (opts?: {
    targetNamespace?: string;
    includes?: string[];
    imports?: { ns: string; loc: string }[];
    elements?: string;
  }) => {
    const ns = opts?.targetNamespace ? ` targetNamespace="${opts.targetNamespace}"` : '';
    const includes = (opts?.includes ?? []).map((loc) => `  <xs:include schemaLocation="${loc}"/>`).join('\n');
    const imports = (opts?.imports ?? [])
      .map((imp) => `  <xs:import namespace="${imp.ns}" schemaLocation="${imp.loc}"/>`)
      .join('\n');
    const elements = opts?.elements ?? '  <xs:element name="Root" type="xs:string"/>';
    return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"${ns}>
${includes}
${imports}
${elements}
</xs:schema>`;
  };

  it('should handle single schema with no dependencies', () => {
    const files = { 'schema.xsd': makeSchema() };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.loadOrder).toEqual(['schema.xsd']);
    expect(result.edges).toHaveLength(0);
  });

  it('should detect include dependency and produce correct load order', () => {
    const files = {
      'A.xsd': makeSchema({ includes: ['B.xsd'] }),
      'B.xsd': makeSchema(),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].from).toBe('A.xsd');
    expect(result.edges[0].to).toBe('B.xsd');
    const aIndex = result.loadOrder.indexOf('A.xsd');
    const bIndex = result.loadOrder.indexOf('B.xsd');
    expect(bIndex).toBeLessThan(aIndex);
  });

  it('should report missing included schema', () => {
    const files = {
      'A.xsd': makeSchema({ includes: ['B.xsd'] }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Missing required schema');
    expect(result.errors[0]).toContain('B.xsd');
    expect(result.errors[0]).toContain('A.xsd');
    expect(result.errors[0]).toContain('xs:include');
  });

  it('should report missing imported schema', () => {
    const files = {
      'A.xsd': makeSchema({ imports: [{ ns: 'http://example.com/types', loc: 'types.xsd' }] }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Missing required schema');
    expect(result.errors[0]).toContain('types.xsd');
    expect(result.errors[0]).toContain('A.xsd');
    expect(result.errors[0]).toContain('xs:import');
  });

  it('should detect circular includes', () => {
    const files = {
      'A.xsd': makeSchema({ includes: ['B.xsd'] }),
      'B.xsd': makeSchema({ includes: ['A.xsd'] }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    const circularErrors = result.errors.filter((e) => e.includes('Circular'));
    expect(circularErrors.length).toBeGreaterThan(0);
    expect(circularErrors[0]).toContain('A.xsd');
    expect(circularErrors[0]).toContain('B.xsd');
  });

  it('should allow circular imports (different namespaces)', () => {
    const files = {
      'A.xsd': makeSchema({
        targetNamespace: 'http://example.com/a',
        imports: [{ ns: 'http://example.com/b', loc: 'B.xsd' }],
      }),
      'B.xsd': makeSchema({
        targetNamespace: 'http://example.com/b',
        imports: [{ ns: 'http://example.com/a', loc: 'A.xsd' }],
      }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Circular xs:import');
    expect(result.loadOrder).toContain('A.xsd');
    expect(result.loadOrder).toContain('B.xsd');
  });

  it('should handle deep chain: A includes B, B includes C', () => {
    const files = {
      'A.xsd': makeSchema({ includes: ['B.xsd'] }),
      'B.xsd': makeSchema({ includes: ['C.xsd'] }),
      'C.xsd': makeSchema(),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    const aIdx = result.loadOrder.indexOf('A.xsd');
    const bIdx = result.loadOrder.indexOf('B.xsd');
    const cIdx = result.loadOrder.indexOf('C.xsd');
    expect(cIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(aIdx);
  });

  it('should report missing leaf in deep chain', () => {
    const files = {
      'A.xsd': makeSchema({ includes: ['B.xsd'] }),
      'B.xsd': makeSchema({ includes: ['C.xsd'] }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('C.xsd');
    expect(result.errors[0]).toContain('B.xsd');
  });

  it('should handle mixed include/import scenarios', () => {
    const files = {
      'main.xsd': makeSchema({
        targetNamespace: 'http://example.com/main',
        includes: ['common.xsd'],
        imports: [{ ns: 'http://example.com/types', loc: 'types.xsd' }],
      }),
      'common.xsd': makeSchema({ targetNamespace: 'http://example.com/main' }),
      'types.xsd': makeSchema({ targetNamespace: 'http://example.com/types' }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.edges).toHaveLength(2);
    const mainIdx = result.loadOrder.indexOf('main.xsd');
    const commonIdx = result.loadOrder.indexOf('common.xsd');
    const typesIdx = result.loadOrder.indexOf('types.xsd');
    expect(commonIdx).toBeLessThan(mainIdx);
    expect(typesIdx).toBeLessThan(mainIdx);
  });

  it('should resolve relative path with subdirectory', () => {
    const files = {
      'schemas/main.xsd': makeSchema({ includes: ['common.xsd'] }),
      'schemas/common.xsd': makeSchema(),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].to).toBe('schemas/common.xsd');
  });

  it('should resolve filename-only match as fallback', () => {
    const files = {
      'main.xsd': makeSchema({ includes: ['common.xsd'] }),
      'types/common.xsd': makeSchema(),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.edges[0].to).toBe('types/common.xsd');
  });

  it('should handle multiple files referencing the same dependency', () => {
    const files = {
      'A.xsd': makeSchema({ includes: ['common.xsd'] }),
      'B.xsd': makeSchema({ includes: ['common.xsd'] }),
      'common.xsd': makeSchema(),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.edges).toHaveLength(2);
    const commonIdx = result.loadOrder.indexOf('common.xsd');
    const aIdx = result.loadOrder.indexOf('A.xsd');
    const bIdx = result.loadOrder.indexOf('B.xsd');
    expect(commonIdx).toBeLessThan(aIdx);
    expect(commonIdx).toBeLessThan(bIdx);
  });

  it('should handle schema with invalid XML gracefully', () => {
    const files = {
      'bad.xsd': 'this is not xml',
      'good.xsd': makeSchema(),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.loadOrder).toContain('bad.xsd');
    expect(result.loadOrder).toContain('good.xsd');
  });

  it('should handle empty definitionFiles', () => {
    const result = XmlSchemaAnalysisService.analyze({});
    expect(result.errors).toHaveLength(0);
    expect(result.loadOrder).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('should report XML parse errors', () => {
    const files = {
      'valid.xsd': makeSchema(),
      'invalid.xsd': 'this is not valid XML',
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('XML parse error');
    expect(result.errors[0]).toContain('invalid.xsd');
  });

  it('should resolve path with parent directory references', () => {
    const files = {
      'schemas/sub/main.xsd': makeSchema({ includes: ['../common.xsd'] }),
      'schemas/common.xsd': makeSchema(),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].to).toBe('schemas/common.xsd');
  });
});
