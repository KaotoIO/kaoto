import { RootElementOption } from '../../../models/datamapper/document';
import { XmlSchemaWrapperGeneratorService } from './xml-schema-wrapper-generator.service';

describe('XmlSchemaWrapperGeneratorService', () => {
  const makeSchema = (opts?: {
    targetNamespace?: string;
    includes?: string[];
    imports?: { ns?: string; loc: string }[];
    elements?: string;
  }) => {
    const ns = opts?.targetNamespace ? ` targetNamespace="${opts.targetNamespace}"` : '';
    const includes = (opts?.includes ?? []).map((loc) => `  <xs:include schemaLocation="${loc}"/>`).join('\n');
    const imports = (opts?.imports ?? [])
      .map((imp) => {
        const nsAttr = imp.ns == null ? '' : ` namespace="${imp.ns}"`;
        return `  <xs:import${nsAttr} schemaLocation="${imp.loc}"/>`;
      })
      .join('\n');
    const elements = opts?.elements ?? '  <xs:element name="Root" type="xs:string"/>';
    return `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"${ns}>
${includes}
${imports}
${elements}
</xs:schema>`;
  };

  it('should handle single file by returning kind: "root"', () => {
    const input = {
      filePaths: ['schema.xsd'],
      definitionFiles: { 'schema.xsd': makeSchema() },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: 'schema.xsd' });
  });

  it('should handle empty filePaths list by returning kind: "root"', () => {
    const input = {
      filePaths: [],
      definitionFiles: {},
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: '' });
  });

  it('should return kind: "root" if one entry point exists even with multiple files', () => {
    // B.xsd is imported by A.xsd, so only A.xsd is the entry point
    const input = {
      filePaths: ['A.xsd', 'B.xsd'],
      definitionFiles: {
        'A.xsd': makeSchema({ imports: [{ ns: 'urn:b', loc: 'B.xsd' }] }),
        'B.xsd': makeSchema({ targetNamespace: 'urn:b' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: 'A.xsd' });
  });

  it('should return kind: "root" with entry point even if input array order is shuffled', () => {
    const input = {
      filePaths: ['B.xsd', 'A.xsd'],
      definitionFiles: {
        'A.xsd': makeSchema({ imports: [{ ns: 'urn:b', loc: 'B.xsd' }] }),
        'B.xsd': makeSchema({ targetNamespace: 'urn:b' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: 'A.xsd' });
  });

  it('should create a wrapper for same-namespace unconnected schemas using xs:include', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'ext.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Dog" type="xs:string"/>',
        }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.uri).toBe('wrapper.xsd');

    expect(wrap.xsd).toContain('targetNamespace="urn:animals"');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="ext.xsd"/>');
    expect(XmlSchemaWrapperGeneratorService.isGeneratedWrapper(wrap.xsd)).toBe(true);
  });

  it('should create a wrapper with xs:import for different-namespace extension', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'ext.xsd': makeSchema({ targetNamespace: 'urn:dogs', elements: '<xs:element name="Dog" type="xs:string"/>' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).toContain('targetNamespace="urn:animals"');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:import namespace="urn:dogs" schemaLocation="ext.xsd"/>');
  });

  it('should create a wrapper with xs:import without namespace for no-namespace extension when root is namespaced', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'ext.xsd': makeSchema({ elements: '<xs:element name="Dog" type="xs:string"/>' }), // no tns
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).toContain('targetNamespace="urn:animals"');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:import schemaLocation="ext.xsd"/>');
    expect(wrap.xsd).not.toContain('namespace=""');
  });

  it('should handle root in no-namespace with a no-ns extension', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({ elements: '<xs:element name="Animal" type="xs:string"/>' }),
        'ext.xsd': makeSchema({ elements: '<xs:element name="Dog" type="xs:string"/>' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).not.toContain('targetNamespace=');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="ext.xsd"/>');
  });

  it('should handle root in no-namespace with a namespaced extension', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({ elements: '<xs:element name="Animal" type="xs:string"/>' }),
        'ext.xsd': makeSchema({ targetNamespace: 'urn:dogs', elements: '<xs:element name="Dog" type="xs:string"/>' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).not.toContain('targetNamespace=');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:import namespace="urn:dogs" schemaLocation="ext.xsd"/>');
  });

  it('should determine wrapper namespace using rootElementChoice if provided', () => {
    const rootElement: RootElementOption = { namespaceUri: 'urn:animals', name: 'Animal' };
    const input = {
      filePaths: ['ext.xsd', 'root.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'ext.xsd': makeSchema({ targetNamespace: 'urn:dogs', elements: '<xs:element name="Dog" type="xs:string"/>' }),
      },
      rootElement,
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).toContain('targetNamespace="urn:animals"');
  });

  it('should fallback to kind: "root" if document build fails', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': '<xs:invalid-tag>',
        'ext.xsd': makeSchema(),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: 'root.xsd' });
  });

  it('should fallback to kind: "root" if there are empty/missing files', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': '',
        'ext.xsd': makeSchema(),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: 'root.xsd' });
  });

  it('should handle cycles by outputting only one entry point per cycle', () => {
    // A and B include each other, C is unconnected
    const input = {
      filePaths: ['A.xsd', 'B.xsd', 'C.xsd'],
      definitionFiles: {
        'A.xsd': makeSchema({
          targetNamespace: 'urn:abc',
          includes: ['B.xsd'],
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'B.xsd': makeSchema({ targetNamespace: 'urn:abc', includes: ['A.xsd'] }),
        'C.xsd': makeSchema({ targetNamespace: 'urn:abc', elements: '<xs:element name="Dog" type="xs:string"/>' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    // Should have only A.xsd (since B.xsd is in the same SCC component as A.xsd and A comes first) and C.xsd
    expect(wrap.xsd).toContain('<xs:include schemaLocation="A.xsd"/>');
    expect(wrap.xsd).not.toContain('<xs:include schemaLocation="B.xsd"/>');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="C.xsd"/>');
  });

  it('should handle relative path conversions correctly across subdirectories', () => {
    const input = {
      filePaths: ['src/main/resources/schemas/root.xsd', 'src/main/resources/schemas/ext.xsd'],
      definitionFiles: {
        'src/main/resources/schemas/root.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'src/main/resources/schemas/ext.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Dog" type="xs:string"/>',
        }),
      },
    };
    const wrapperPath = 'src/main/resources/xslt/wrapper.xsd';
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, wrapperPath);
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).toContain('<xs:include schemaLocation="../schemas/root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="../schemas/ext.xsd"/>');
  });

  it('should warn and emit only the first import when multiple unconnected files use the same non-root namespace', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input = {
      filePaths: ['root.xsd', 'ext1.xsd', 'ext2.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({
          targetNamespace: 'urn:root',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'ext1.xsd': makeSchema({ targetNamespace: 'urn:ext', elements: '<xs:element name="Dog" type="xs:string"/>' }),
        'ext2.xsd': makeSchema({ targetNamespace: 'urn:ext', elements: '<xs:element name="Cat" type="xs:string"/>' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).toContain('<xs:include schemaLocation="root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:import namespace="urn:ext" schemaLocation="ext1.xsd"/>');
    expect(wrap.xsd).not.toContain('<xs:import namespace="urn:ext" schemaLocation="ext2.xsd"/>');
    expect(consoleWarnSpy).toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });

  it('should validate generated wrapper using DOMParser', () => {
    const input = {
      filePaths: ['root.xsd', 'ext.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'ext.xsd': makeSchema({
          targetNamespace: 'urn:animals',
          elements: '<xs:element name="Dog" type="xs:string"/>',
        }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };

    const parser = new DOMParser();
    const doc = parser.parseFromString(wrap.xsd, 'text/xml');
    const schemaEl = doc.documentElement;
    expect(schemaEl.nodeName).toBe('xs:schema');
    expect(schemaEl.getAttribute('targetNamespace')).toBe('urn:animals');

    const includes = doc.getElementsByTagName('xs:include');
    expect(includes).toHaveLength(2);
    expect(includes[0].getAttribute('schemaLocation')).toBe('root.xsd');
    expect(includes[1].getAttribute('schemaLocation')).toBe('ext.xsd');
  });

  it('should escape XML special characters in attribute values of generated wrapper', () => {
    const input = {
      filePaths: ['root.xsd', 'ext&types.xsd'],
      definitionFiles: {
        'root.xsd': makeSchema({
          targetNamespace: 'urn:animals&amp;birds',
          elements: '<xs:element name="Animal" type="xs:string"/>',
        }),
        'ext&types.xsd': makeSchema({
          targetNamespace: 'urn:animals&amp;birds',
          elements: '<xs:element name="Dog" type="xs:string"/>',
        }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).toContain('targetNamespace="urn:animals&amp;birds"');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="root.xsd"/>');
    expect(wrap.xsd).toContain('<xs:include schemaLocation="ext&amp;types.xsd"/>');

    const parser = new DOMParser();
    const doc = parser.parseFromString(wrap.xsd, 'text/xml');
    const errors = doc.getElementsByTagName('parsererror');
    expect(errors).toHaveLength(0);

    const schemaEl = doc.documentElement;
    expect(schemaEl.getAttribute('targetNamespace')).toBe('urn:animals&birds');
    const includes = doc.getElementsByTagName('xs:include');
    expect(includes).toHaveLength(2);
    expect(includes[1].getAttribute('schemaLocation')).toBe('ext&types.xsd');
  });
});
