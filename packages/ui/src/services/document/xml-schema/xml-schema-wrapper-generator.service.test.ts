import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  RootElementOption,
} from '../../../models/datamapper/document';
import { XmlSchemaDocumentService } from './xml-schema-document.service';
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
      definitionFiles: { 'schema.xsd': makeSchema() },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: 'schema.xsd', warnings: [] });
  });

  it('should return kind: "root" if one entry point exists even with multiple files', () => {
    // B.xsd is imported by A.xsd, so only A.xsd is the entry point
    const input = {
      definitionFiles: {
        'A.xsd': makeSchema({ imports: [{ ns: 'urn:b', loc: 'B.xsd' }] }),
        'B.xsd': makeSchema({ targetNamespace: 'urn:b' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: 'A.xsd', warnings: [] });
  });

  it('should create a wrapper for same-namespace unconnected schemas using xs:include', () => {
    const input = {
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
      definitionFiles: {
        'root.xsd': '<xs:invalid-tag>',
        'ext.xsd': makeSchema(),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('root');
    expect(result.uri).toBe('root.xsd');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Schema analysis failed');
  });

  it('should handle cycles by outputting only one entry point per cycle', () => {
    // A and B include each other, C is unconnected
    const input = {
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

  it('should report a warning and emit only the first import when multiple unconnected files use the same non-root namespace', () => {
    const input = {
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
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('urn:ext');
    expect(result.warnings[0]).toContain('ext2.xsd');
  });

  it('should not log to the console (the caller reports warnings)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    XmlSchemaWrapperGeneratorService.computeValidationUri(
      { definitionFiles: { 'root.xsd': '<xs:invalid-tag>', 'ext.xsd': makeSchema() } },
      'wrapper.xsd',
    );
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('should return an empty root uri for empty definitionFiles', () => {
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri({ definitionFiles: {} }, 'wrapper.xsd');
    expect(result).toEqual({ kind: 'root', uri: '', warnings: [] });
  });

  it('should fall back to the first file with a warning when the root element cannot be determined', () => {
    const input = {
      definitionFiles: {
        'a.xsd': makeSchema({ targetNamespace: 'urn:a' }),
        'b.xsd': makeSchema({ targetNamespace: 'urn:b' }),
      },
      rootElement: { namespaceUri: 'urn:missing', name: 'Nope' } as RootElementOption,
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    expect(result.kind).toBe('root');
    expect(result.uri).toBe('a.xsd');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('root element');
  });

  it('should keep the file order of definitionFiles in the generated wrapper', () => {
    const input = {
      definitionFiles: {
        'z.xsd': makeSchema({ targetNamespace: 'urn:animals' }),
        'a.xsd': makeSchema({ targetNamespace: 'urn:animals', elements: '<xs:element name="Dog" type="xs:string"/>' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'wrapper.xsd');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd.indexOf('z.xsd')).toBeLessThan(wrap.xsd.indexOf('a.xsd'));
  });

  it('should name the XSLT file in the generated comment', () => {
    const input = {
      definitionFiles: {
        'root.xsd': makeSchema({ targetNamespace: 'urn:animals' }),
        'ext.xsd': makeSchema({ targetNamespace: 'urn:animals' }),
      },
    };
    const result = XmlSchemaWrapperGeneratorService.computeValidationUri(input, 'dir/my-map-validation-wrapper.xsd');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    expect(wrap.xsd).toContain('Generated by Kaoto DataMapper for my-map.xsl.');
  });

  describe('getWrapperPath', () => {
    it.each([
      ['foo.xsl', 'foo-validation-wrapper.xsd'],
      ['foo.XSL', 'foo-validation-wrapper.xsd'],
      ['dir/foo.bar.xsl', 'dir/foo.bar-validation-wrapper.xsd'],
      ['foo', 'foo-validation-wrapper.xsd'],
      ['foo.xslt', 'foo.xslt-validation-wrapper.xsd'],
    ])('should map %s to %s and never to itself', (xsltPath, expected) => {
      const wrapperPath = XmlSchemaWrapperGeneratorService.getWrapperPath(xsltPath);
      expect(wrapperPath).toBe(expected);
      expect(wrapperPath).not.toBe(xsltPath);
    });
  });

  it('should validate generated wrapper using DOMParser', () => {
    const input = {
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

  it('should load the generated wrapper through the schema loading path and resolve its relative includes', () => {
    const definitionFiles = {
      'src/main/resources/schemas/root.xsd': makeSchema({
        targetNamespace: 'urn:animals',
        elements: '<xs:element name="Animal" type="xs:string"/>',
      }),
      'src/main/resources/schemas/ext.xsd': makeSchema({
        targetNamespace: 'urn:animals',
        elements: '<xs:element name="Dog" type="xs:string"/>',
      }),
    };
    const wrapperPath = 'src/main/resources/xslt/wrapper.xsd';

    const result = XmlSchemaWrapperGeneratorService.computeValidationUri({ definitionFiles }, wrapperPath);

    expect(result.kind).toBe('wrapper');
    const wrap = result as { kind: 'wrapper'; uri: string; xsd: string };
    const definition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      'target-body',
      { ...definitionFiles, [wrap.uri]: wrap.xsd },
    );

    const loaded = XmlSchemaDocumentService.createXmlSchemaDocument(definition);

    expect(loaded.validationStatus).toBe('success');
    expect(loaded.document?.rootElement).toBeDefined();
  });

  it('should escape XML special characters in attribute values of generated wrapper', () => {
    const input = {
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
