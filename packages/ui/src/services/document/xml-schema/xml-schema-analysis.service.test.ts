import { DependencyEdge, XmlSchemaAnalysisService } from './xml-schema-analysis.service';

describe('XmlSchemaAnalysisService', () => {
  const makeSchema = (opts?: {
    targetNamespace?: string;
    includes?: string[];
    redefines?: string[];
    imports?: { ns?: string; loc: string }[];
    elements?: string;
  }) => {
    const ns = opts?.targetNamespace ? ` targetNamespace="${opts.targetNamespace}"` : '';
    const includes = [
      ...(opts?.includes ?? []).map((loc) => `  <xs:include schemaLocation="${loc}"/>`),
      ...(opts?.redefines ?? []).map((loc) => `  <xs:redefine schemaLocation="${loc}"/>`),
    ].join('\n');
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
    expect(result.errors[0].message).toContain('Missing required schema');
    expect(result.errors[0].message).toContain('B.xsd');
    expect(result.errors[0].message).toContain('A.xsd');
    expect(result.errors[0].message).toContain('xs:include');
    expect(result.errors[0].filePath).toBe('A.xsd');
  });

  it('should report missing imported schema', () => {
    const files = {
      'A.xsd': makeSchema({ imports: [{ ns: 'http://example.com/types', loc: 'types.xsd' }] }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Missing required schema');
    expect(result.errors[0].message).toContain('types.xsd');
    expect(result.errors[0].message).toContain('A.xsd');
    expect(result.errors[0].message).toContain('xs:import');
    expect(result.errors[0].filePath).toBe('A.xsd');
  });

  it('should warn on circular includes instead of erroring', () => {
    const files = {
      'A.xsd': makeSchema({ includes: ['B.xsd'] }),
      'B.xsd': makeSchema({ includes: ['A.xsd'] }),
    };
    const result = XmlSchemaAnalysisService.analyze(files);
    const circularErrors = result.errors.filter((e) => e.message.includes('Circular'));
    expect(circularErrors).toHaveLength(0);
    const circularWarnings = result.warnings.filter((w) => w.message.includes('Circular xs:include'));
    expect(circularWarnings).toEqual([
      {
        filePath: 'A.xsd',
        message: 'Circular xs:include detected: A.xsd->B.xsd->A.xsd',
      },
      {
        filePath: 'B.xsd',
        message: 'Circular xs:include detected: B.xsd->A.xsd->B.xsd',
      },
    ]);
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
    expect(result.warnings[0].message).toContain('Circular xs:import');
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
    expect(result.errors[0].message).toContain('C.xsd');
    expect(result.errors[0].message).toContain('B.xsd');
    expect(result.errors[0].filePath).toBe('B.xsd');
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
    expect(result.errors[0].message).toContain('XML parse error');
    expect(result.errors[0].message).toContain('invalid.xsd');
    expect(result.errors[0].filePath).toBe('invalid.xsd');
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

  describe('malformed occurrence values', () => {
    const warningsFor = (elements: string) =>
      XmlSchemaAnalysisService.analyze({ 'schema.xsd': makeSchema({ elements }) }).warnings;

    it('should report each malformed value on a particle once, in document order', () => {
      const warnings = warningsFor(
        '<xs:element name="Root"><xs:complexType><xs:sequence maxOccurs="x">' +
          '<xs:element name="a" type="xs:string" minOccurs="-1" maxOccurs="1.5"/>' +
          '<xs:element ref="Root" maxOccurs="3abc"/>' +
          '<xs:any minOccurs="y"/>' +
          '</xs:sequence></xs:complexType></xs:element>',
      );

      expect(warnings).toEqual([
        { message: 'Invalid maxOccurs value "x" on xs:sequence; the default 1 is used.', filePath: 'schema.xsd' },
        {
          message: 'Invalid minOccurs value "-1" on xs:element name="a"; the default 1 is used.',
          filePath: 'schema.xsd',
        },
        {
          message: 'Invalid maxOccurs value "1.5" on xs:element name="a"; the default 1 is used.',
          filePath: 'schema.xsd',
        },
        {
          message: 'Invalid maxOccurs value "3abc" on xs:element ref="Root"; the default 1 is used.',
          filePath: 'schema.xsd',
        },
        { message: 'Invalid minOccurs value "y" on xs:any; the default 1 is used.', filePath: 'schema.xsd' },
      ]);
    });

    it('should report a value padded with a no-break space, which is not XML whitespace', () => {
      const warnings = warningsFor(
        '<xs:element name="Root"><xs:complexType><xs:sequence>' +
          '<xs:element name="a" type="xs:string" maxOccurs="&#xA0;0&#xA0;"/>' +
          '</xs:sequence></xs:complexType></xs:element>',
      );

      expect(warnings.map((w) => w.message)).toEqual([
        'Invalid maxOccurs value "\u00A00\u00A0" on xs:element name="a"; the default 1 is used.',
      ]);
    });

    it('should report a malformed value on a global element and on a group reference', () => {
      const warnings = warningsFor(
        '<xs:element name="Root" type="xs:string" maxOccurs="z"/>' +
          '<xs:group name="G"><xs:sequence><xs:element name="a" type="xs:string"/></xs:sequence></xs:group>' +
          '<xs:complexType name="T"><xs:group ref="G" maxOccurs="w"/></xs:complexType>',
      );

      expect(warnings.map((w) => w.message)).toEqual([
        'Invalid maxOccurs value "z" on xs:element name="Root"; the default 1 is used.',
        'Invalid maxOccurs value "w" on xs:group ref="G"; the default 1 is used.',
      ]);
    });

    it.each([
      [
        'annotation content',
        '<xs:element name="Root"><xs:annotation><xs:appinfo>' +
          '<xs:element name="Example" maxOccurs="bad"/></xs:appinfo></xs:annotation></xs:element>',
      ],
      [
        'type alternative content',
        '<xs:element name="Root"><xs:alternative test="true()"><xs:complexType><xs:sequence>' +
          '<xs:element name="a" maxOccurs="bad"/></xs:sequence></xs:complexType></xs:alternative></xs:element>',
      ],
      ['a named group definition', '<xs:group name="G" maxOccurs="bad"><xs:sequence/></xs:group>'],
      [
        'override content',
        '<xs:override schemaLocation="base.xsd"><xs:complexType name="T"><xs:sequence>' +
          '<xs:element name="a" maxOccurs="bad"/></xs:sequence></xs:complexType></xs:override>',
      ],
      [
        'an element directly under redefine',
        '<xs:redefine schemaLocation="base.xsd"><xs:element name="E" maxOccurs="bad"/></xs:redefine>',
      ],
      [
        'an xs:any inside xs:all',
        '<xs:complexType name="T"><xs:all><xs:any maxOccurs="bad"/></xs:all></xs:complexType>',
      ],
      [
        'foreign-namespace content',
        '<xs:element name="Root" xmlns:f="urn:foreign"><xs:complexType><xs:sequence>' +
          '<f:element maxOccurs="bad"/></xs:sequence></xs:complexType></xs:element>',
      ],
      [
        'valid values',
        '<xs:element name="Root"><xs:complexType><xs:sequence minOccurs="0" maxOccurs="unbounded">' +
          '<xs:element name="a" type="xs:string" minOccurs="+0" maxOccurs="007"/></xs:sequence></xs:complexType></xs:element>',
      ],
    ])('should report nothing for %s', (_label, elements) => {
      expect(warningsFor(elements)).toEqual([]);
    });
  });

  describe('findUnreferencedSchemas', () => {
    it('should return the single file for a single schema', () => {
      const report = XmlSchemaAnalysisService.analyze({ 'root.xsd': makeSchema() });
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(report)).toEqual(['root.xsd']);
    });

    it('should return both files when two schemas are not connected', () => {
      const report = XmlSchemaAnalysisService.analyze({ 'a.xsd': makeSchema(), 'b.xsd': makeSchema() });
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(report)).toEqual(['a.xsd', 'b.xsd']);
    });

    it('should return only the head of a chain A -> B -> C', () => {
      const report = XmlSchemaAnalysisService.analyze({
        'C.xsd': makeSchema(),
        'B.xsd': makeSchema({ includes: ['C.xsd'] }),
        'A.xsd': makeSchema({ includes: ['B.xsd'] }),
      });
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(report)).toEqual(['A.xsd']);
    });

    it('should return a single schema for an import cycle that nobody else references', () => {
      const report = XmlSchemaAnalysisService.analyze({
        'a.xsd': makeSchema({ targetNamespace: 'urn:a', imports: [{ ns: 'urn:b', loc: 'b.xsd' }] }),
        'b.xsd': makeSchema({ targetNamespace: 'urn:b', imports: [{ ns: 'urn:a', loc: 'a.xsd' }] }),
      });
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(report)).toEqual(['a.xsd']);
    });

    it('should return the head of the cycle and an unrelated file', () => {
      const report = XmlSchemaAnalysisService.analyze({
        'a.xsd': makeSchema({ targetNamespace: 'urn:a', imports: [{ ns: 'urn:b', loc: 'b.xsd' }] }),
        'b.xsd': makeSchema({ targetNamespace: 'urn:b', imports: [{ ns: 'urn:a', loc: 'a.xsd' }] }),
        'other.xsd': makeSchema({ targetNamespace: 'urn:other' }),
      });
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(report)).toEqual(['a.xsd', 'other.xsd']);
    });

    it('should return an empty list for an empty report', () => {
      const report = XmlSchemaAnalysisService.analyze({});
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(report)).toEqual([]);
    });

    it('should support explicit (nodes, edges) overload', () => {
      const nodes = ['Main.xsd', 'Types.xsd'];
      const edges: DependencyEdge[] = [
        {
          from: 'Main.xsd',
          to: 'Types.xsd',
          directive: { type: 'include', schemaLocation: 'Types.xsd', namespace: null },
        },
      ];
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(nodes, edges)).toEqual(['Main.xsd']);
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas([], [])).toEqual([]);
    });
  });

  describe('namespace validation', () => {
    describe('xs:include namespace validation', () => {
      it('should allow include with matching targetNamespace', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/main',
            includes: ['helper.xsd'],
          }),
          'helper.xsd': makeSchema({ targetNamespace: 'http://example.com/main' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toHaveLength(0);
      });

      it('should report error for include with mismatched targetNamespace', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/main',
            includes: ['helper.xsd'],
          }),
          'helper.xsd': makeSchema({ targetNamespace: 'http://example.com/other' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        const nsErrors = result.errors.filter((e) => e.message.includes('Namespace mismatch'));
        expect(nsErrors).toHaveLength(1);
        expect(nsErrors[0].message).toContain('xs:include');
        expect(nsErrors[0].message).toContain('main.xsd');
        expect(nsErrors[0].message).toContain('helper.xsd');
        expect(nsErrors).toEqual([
          {
            filePath: 'main.xsd',
            message:
              'Namespace mismatch in xs:include: "main.xsd" (targetNamespace: http://example.com/main) includes "helper.xsd" (targetNamespace: http://example.com/other). Included schemas must have the same targetNamespace or no targetNamespace (chameleon include).',
          },
        ]);
      });

      it('should allow chameleon include (no targetNamespace on included schema)', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/main',
            includes: ['helper.xsd'],
          }),
          'helper.xsd': makeSchema(),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toHaveLength(0);
      });

      it('should allow include when both schemas have no targetNamespace', () => {
        const files = {
          'main.xsd': makeSchema({ includes: ['helper.xsd'] }),
          'helper.xsd': makeSchema(),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toHaveLength(0);
      });

      it('should report error when parent has no targetNamespace but included schema does', () => {
        const files = {
          'main.xsd': makeSchema({ includes: ['helper.xsd'] }),
          'helper.xsd': makeSchema({ targetNamespace: 'http://example.com/helper' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        const nsErrors = result.errors.filter((e) => e.message.includes('Namespace mismatch'));
        expect(nsErrors).toHaveLength(1);
        expect(nsErrors[0].message).toContain('xs:include');
        expect(nsErrors[0].message).toContain('main.xsd');
        expect(nsErrors[0].message).toContain('helper.xsd');
        expect(nsErrors[0].message).toContain('chameleon');
        expect(nsErrors).toEqual([
          {
            filePath: 'main.xsd',
            message:
              'Namespace mismatch in xs:include: "main.xsd" (targetNamespace: (no targetNamespace)) includes "helper.xsd" (targetNamespace: http://example.com/helper). Included schemas must have the same targetNamespace or no targetNamespace (chameleon include).',
          },
        ]);
      });

      it('should accept a chameleon schema that includes a schema of the namespace it is included into', () => {
        const files = {
          'Main.xsd': makeSchema({ targetNamespace: 'urn:x', includes: ['Mod.xsd'] }),
          'Mod.xsd': makeSchema({ includes: ['Sub.xsd'], elements: '' }),
          'Sub.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toEqual([]);
      });

      it('should report a chameleon schema that includes a schema of another namespace than it is included into', () => {
        const files = {
          'Main.xsd': makeSchema({ targetNamespace: 'urn:y', includes: ['Mod.xsd'] }),
          'Mod.xsd': makeSchema({ includes: ['Sub.xsd'], elements: '' }),
          'Sub.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toEqual([
          {
            filePath: 'Mod.xsd',
            message:
              'Namespace mismatch in xs:include: "Mod.xsd" (no targetNamespace, reached as urn:y) includes "Sub.xsd" (targetNamespace: urn:x). Included schemas must have the same targetNamespace or no targetNamespace (chameleon include).',
          },
        ]);
      });

      it('should report a chameleon schema once per reached namespace that differs from the included schema', () => {
        const files = {
          'A.xsd': makeSchema({ targetNamespace: 'urn:a', includes: ['Mod.xsd'] }),
          'B.xsd': makeSchema({ targetNamespace: 'urn:b', includes: ['Mod.xsd'] }),
          'Mod.xsd': makeSchema({ includes: ['Sub.xsd'], elements: '' }),
          'Sub.xsd': makeSchema({ targetNamespace: 'urn:a', elements: '' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toEqual([
          {
            filePath: 'Mod.xsd',
            message:
              'Namespace mismatch in xs:include: "Mod.xsd" (no targetNamespace, reached as urn:b) includes "Sub.xsd" (targetNamespace: urn:a). Included schemas must have the same targetNamespace or no targetNamespace (chameleon include).',
          },
        ]);
      });
    });

    describe('xs:redefine namespace validation', () => {
      it('should allow redefine with matching targetNamespace', () => {
        const files = {
          'impl.xsd': makeSchema({ targetNamespace: 'urn:x', redefines: ['base.xsd'] }),
          'base.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).errors).toEqual([]);
      });

      it('should allow chameleon redefine (no targetNamespace on redefined schema)', () => {
        const files = {
          'impl.xsd': makeSchema({ targetNamespace: 'urn:x', redefines: ['base.xsd'] }),
          'base.xsd': makeSchema({ elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).errors).toEqual([]);
      });

      it('should report error for redefine with mismatched targetNamespace', () => {
        const files = {
          'impl.xsd': makeSchema({ targetNamespace: 'urn:x', redefines: ['base.xsd'] }),
          'base.xsd': makeSchema({ targetNamespace: 'urn:y', elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).errors).toEqual([
          {
            filePath: 'impl.xsd',
            message:
              'Namespace mismatch in xs:redefine: "impl.xsd" (targetNamespace: urn:x) redefines "base.xsd" (targetNamespace: urn:y). Redefined schemas must have the same targetNamespace or no targetNamespace (chameleon redefine).',
          },
        ]);
      });

      it('should accept a chameleon redefiner included into the namespace of the redefined schema', () => {
        const files = {
          'Main.xsd': makeSchema({ targetNamespace: 'urn:x', includes: ['Mod.xsd'] }),
          'Mod.xsd': makeSchema({ redefines: ['Base.xsd'], elements: '' }),
          'Base.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).errors).toEqual([]);
      });

      it('should report a chameleon redefiner included into another namespace than the redefined schema', () => {
        const files = {
          'Main.xsd': makeSchema({ targetNamespace: 'urn:y', includes: ['Mod.xsd'] }),
          'Mod.xsd': makeSchema({ redefines: ['Base.xsd'], elements: '' }),
          'Base.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).errors).toEqual([
          {
            filePath: 'Mod.xsd',
            message:
              'Namespace mismatch in xs:redefine: "Mod.xsd" (no targetNamespace, reached as urn:y) redefines "Base.xsd" (targetNamespace: urn:x). Redefined schemas must have the same targetNamespace or no targetNamespace (chameleon redefine).',
          },
        ]);
      });
    });

    describe('xs:import namespace validation', () => {
      it('should allow import with matching namespace', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/main',
            imports: [{ ns: 'http://example.com/types', loc: 'types.xsd' }],
          }),
          'types.xsd': makeSchema({ targetNamespace: 'http://example.com/types' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toHaveLength(0);
      });

      it('should report error for import with mismatched namespace', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/main',
            imports: [{ ns: 'http://example.com/types', loc: 'types.xsd' }],
          }),
          'types.xsd': makeSchema({ targetNamespace: 'http://example.com/other' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        const nsErrors = result.errors.filter((e) => e.message.includes('Namespace mismatch'));
        expect(nsErrors).toHaveLength(1);
        expect(nsErrors[0].message).toContain('xs:import');
        expect(nsErrors[0].message).toContain('main.xsd');
        expect(nsErrors[0].message).toContain('types.xsd');
      });

      it('should report error when import has no namespace but schema has targetNamespace', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/main',
            imports: [{ loc: 'types.xsd' }],
          }),
          'types.xsd': makeSchema({ targetNamespace: 'http://example.com/types' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        const nsErrors = result.errors.filter((e) => e.message.includes('Namespace mismatch'));
        expect(nsErrors).toHaveLength(1);
        expect(nsErrors[0].message).toContain('xs:import');
      });

      it('should report error when import has namespace but schema has no targetNamespace', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/main',
            imports: [{ ns: 'http://example.com/types', loc: 'types.xsd' }],
          }),
          'types.xsd': makeSchema(),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        const nsErrors = result.errors.filter((e) => e.message.includes('Namespace mismatch'));
        expect(nsErrors).toHaveLength(1);
        expect(nsErrors[0].message).toContain('xs:import');
      });

      it('should allow import when both namespace and targetNamespace are absent', () => {
        const files = {
          'main.xsd': makeSchema({ imports: [{ loc: 'types.xsd' }] }),
          'types.xsd': makeSchema(),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('duplicate targetNamespace detection', () => {
      it('should warn when multiple schemas share the same targetNamespace', () => {
        const files = {
          'types1.xsd': makeSchema({ targetNamespace: 'http://example.com/types' }),
          'types2.xsd': makeSchema({ targetNamespace: 'http://example.com/types' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toHaveLength(0);
        const nsWarnings = result.warnings.filter((w) => w.message.includes('Multiple schemas'));
        expect(nsWarnings).toHaveLength(2);
        expect(nsWarnings[0]).toEqual({
          filePath: 'types1.xsd',
          message: 'Multiple schemas share targetNamespace "http://example.com/types": "types2.xsd"',
        });
        expect(nsWarnings[1]).toEqual({
          filePath: 'types2.xsd',
          message: 'Multiple schemas share targetNamespace "http://example.com/types": "types1.xsd"',
        });
      });

      it('should not warn when schemas have no targetNamespace', () => {
        const files = {
          'A.xsd': makeSchema(),
          'B.xsd': makeSchema(),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        const nsWarnings = result.warnings.filter((w) => w.message.includes('Multiple schemas'));
        expect(nsWarnings).toHaveLength(0);
      });

      it('should not warn when same-namespace schemas are connected via xs:include', () => {
        const files = {
          'main.xsd': makeSchema({
            targetNamespace: 'http://example.com/shared',
            includes: ['componentA.xsd', 'componentB.xsd'],
          }),
          'componentA.xsd': makeSchema({ targetNamespace: 'http://example.com/shared' }),
          'componentB.xsd': makeSchema({ targetNamespace: 'http://example.com/shared' }),
        };
        const result = XmlSchemaAnalysisService.analyze(files);
        expect(result.errors).toHaveLength(0);
        const nsWarnings = result.warnings.filter((w) => w.message.includes('Multiple schemas'));
        expect(nsWarnings).toHaveLength(0);
      });

      it('should not warn for a third same-namespace schema next to an include pair', () => {
        const files = {
          'main.xsd': makeSchema({ targetNamespace: 'urn:x', includes: ['component.xsd'] }),
          'component.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
          'other.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).warnings).toEqual([]);
      });

      it('should not warn when same-namespace schemas are connected via xs:redefine', () => {
        const files = {
          'impl.xsd': makeSchema({ targetNamespace: 'urn:x', redefines: ['base.xsd'] }),
          'base.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).warnings).toEqual([]);
      });

      it('should not warn for a third same-namespace schema next to a redefine pair', () => {
        const files = {
          'impl.xsd': makeSchema({ targetNamespace: 'urn:x', redefines: ['base.xsd'] }),
          'base.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
          'other.xsd': makeSchema({ targetNamespace: 'urn:x', elements: '' }),
        };
        expect(XmlSchemaAnalysisService.analyze(files).warnings).toEqual([]);
      });
    });

    it('should report multiple namespace issues at once', () => {
      const files = {
        'main.xsd': makeSchema({
          targetNamespace: 'http://example.com/main',
          includes: ['bad-include.xsd'],
          imports: [{ ns: 'http://example.com/types', loc: 'bad-import.xsd' }],
        }),
        'bad-include.xsd': makeSchema({ targetNamespace: 'http://example.com/wrong' }),
        'bad-import.xsd': makeSchema({ targetNamespace: 'http://example.com/other' }),
      };
      const result = XmlSchemaAnalysisService.analyze(files);
      const nsErrors = result.errors.filter((e) => e.message.includes('Namespace mismatch'));
      expect(nsErrors).toHaveLength(2);
      expect(nsErrors.some((e) => e.message.includes('xs:include'))).toBe(true);
      expect(nsErrors.some((e) => e.message.includes('xs:import'))).toBe(true);
    });
  });

  describe('with xs:redefine', () => {
    it('should create a redefine edge and load the redefined schema first in every input order', () => {
      const impl = makeSchema({ redefines: ['base.xsd'] });
      const base = makeSchema({ elements: '' });

      const implFirst = XmlSchemaAnalysisService.analyze({ 'impl.xsd': impl, 'base.xsd': base });
      const baseFirst = XmlSchemaAnalysisService.analyze({ 'base.xsd': base, 'impl.xsd': impl });

      expect(implFirst.edges).toEqual([
        {
          from: 'impl.xsd',
          to: 'base.xsd',
          directive: { type: 'redefine', schemaLocation: 'base.xsd', namespace: null },
        },
      ]);
      expect(implFirst.loadOrder).toEqual(['base.xsd', 'impl.xsd']);
      expect(baseFirst.loadOrder).toEqual(['base.xsd', 'impl.xsd']);
      expect(implFirst.errors).toEqual([]);
      expect(implFirst.warnings).toEqual([]);
    });

    it('should report a missing redefined schema', () => {
      const result = XmlSchemaAnalysisService.analyze({ 'impl.xsd': makeSchema({ redefines: ['base.xsd'] }) });
      expect(result.errors).toEqual([
        {
          filePath: 'impl.xsd',
          message: 'Missing required schema: "base.xsd" referenced by "impl.xsd" via xs:redefine',
        },
      ]);
    });

    it('should not offer the redefined schema as an unreferenced schema', () => {
      const result = XmlSchemaAnalysisService.analyze({
        'base.xsd': makeSchema(),
        'impl.xsd': makeSchema({ redefines: ['base.xsd'] }),
      });
      expect(XmlSchemaAnalysisService.findUnreferencedSchemas(result)).toEqual(['impl.xsd']);
    });

    describe('circular redefines', () => {
      it('should warn on a redefine cycle', () => {
        const result = XmlSchemaAnalysisService.analyze({
          'A.xsd': makeSchema({ redefines: ['B.xsd'] }),
          'B.xsd': makeSchema({ redefines: ['A.xsd'] }),
        });
        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([
          { filePath: 'A.xsd', message: 'Circular xs:redefine detected: A.xsd->B.xsd->A.xsd' },
          { filePath: 'B.xsd', message: 'Circular xs:redefine detected: B.xsd->A.xsd->B.xsd' },
        ]);
        expect(result.loadOrder).toEqual(['A.xsd', 'B.xsd']);
      });

      it('should warn on a cycle that mixes include and redefine', () => {
        const result = XmlSchemaAnalysisService.analyze({
          'A.xsd': makeSchema({ includes: ['B.xsd'] }),
          'B.xsd': makeSchema({ redefines: ['A.xsd'] }),
        });
        expect(result.warnings).toEqual([
          { filePath: 'B.xsd', message: 'Circular xs:include/xs:redefine detected: B.xsd->A.xsd->B.xsd' },
          { filePath: 'A.xsd', message: 'Circular xs:include/xs:redefine detected: A.xsd->B.xsd->A.xsd' },
        ]);
      });

      it('should label a cycle through an include and a redefine between the same two files', () => {
        const result = XmlSchemaAnalysisService.analyze({
          'A.xsd': makeSchema({ includes: ['B.xsd'], redefines: ['B.xsd'] }),
          'B.xsd': makeSchema({ includes: ['A.xsd'] }),
        });
        expect(result.warnings).toEqual([
          { filePath: 'A.xsd', message: 'Circular xs:include detected: A.xsd->B.xsd->A.xsd' },
          { filePath: 'B.xsd', message: 'Circular xs:include detected: B.xsd->A.xsd->B.xsd' },
          { filePath: 'A.xsd', message: 'Circular xs:include/xs:redefine detected: A.xsd->B.xsd->A.xsd' },
          { filePath: 'B.xsd', message: 'Circular xs:include/xs:redefine detected: B.xsd->A.xsd->B.xsd' },
        ]);
      });

      it('should find a redefine cycle that a depth-first search in directive order would not report', () => {
        const result = XmlSchemaAnalysisService.analyze({
          'A.xsd': makeSchema({ includes: ['B.xsd'], redefines: ['C.xsd'] }),
          'B.xsd': makeSchema({ includes: ['A.xsd'] }),
          'C.xsd': makeSchema({ includes: ['B.xsd'] }),
        });
        expect(result.warnings).toEqual([
          { filePath: 'A.xsd', message: 'Circular xs:include detected: A.xsd->B.xsd->A.xsd' },
          { filePath: 'B.xsd', message: 'Circular xs:include detected: B.xsd->A.xsd->B.xsd' },
          { filePath: 'A.xsd', message: 'Circular xs:include/xs:redefine detected: A.xsd->C.xsd->B.xsd->A.xsd' },
          { filePath: 'C.xsd', message: 'Circular xs:include/xs:redefine detected: C.xsd->B.xsd->A.xsd->C.xsd' },
          { filePath: 'B.xsd', message: 'Circular xs:include/xs:redefine detected: B.xsd->A.xsd->C.xsd->B.xsd' },
        ]);
      });

      it('should not give a redefine warning to a component member that lies on no cycle with a redefine', () => {
        const result = XmlSchemaAnalysisService.analyze({
          'A.xsd': makeSchema({ includes: ['C.xsd'], redefines: ['B.xsd'] }),
          'B.xsd': makeSchema({ includes: ['A.xsd'] }),
          'C.xsd': makeSchema({ includes: ['B.xsd'] }),
        });
        expect(result.warnings).toEqual([
          { filePath: 'A.xsd', message: 'Circular xs:include detected: A.xsd->C.xsd->B.xsd->A.xsd' },
          { filePath: 'C.xsd', message: 'Circular xs:include detected: C.xsd->B.xsd->A.xsd->C.xsd' },
          { filePath: 'B.xsd', message: 'Circular xs:include detected: B.xsd->A.xsd->C.xsd->B.xsd' },
          { filePath: 'A.xsd', message: 'Circular xs:include/xs:redefine detected: A.xsd->B.xsd->A.xsd' },
          { filePath: 'B.xsd', message: 'Circular xs:include/xs:redefine detected: B.xsd->A.xsd->B.xsd' },
        ]);
      });

      it('should warn on a schema that redefines itself', () => {
        const result = XmlSchemaAnalysisService.analyze({ 'A.xsd': makeSchema({ redefines: ['A.xsd'] }) });
        expect(result.warnings).toEqual([
          { filePath: 'A.xsd', message: 'Circular xs:redefine detected: A.xsd->A.xsd' },
        ]);
      });
    });
  });

  describe('isIncludeLikeDirective', () => {
    it.each([
      ['include', true],
      ['redefine', true],
      ['import', false],
    ] as const)('should return %s -> %s', (type, expected) => {
      expect(XmlSchemaAnalysisService.isIncludeLikeDirective(type)).toBe(expected);
    });
  });

  describe('collectEffectiveNamespaces', () => {
    const collect = (files: Record<string, string>, entry: string) => {
      const { edges, fileInfos } = XmlSchemaAnalysisService.analyze(files);
      const syntacticNamespaces = new Map(
        [...fileInfos].map(([filePath, info]) => [filePath, info.targetNamespace ?? '']),
      );
      const effective = XmlSchemaAnalysisService.collectEffectiveNamespaces(entry, edges, syntacticNamespaces);
      return Object.fromEntries([...effective].map(([filePath, namespaces]) => [filePath, [...namespaces]]));
    };

    it('should let a chameleon include target adopt the including namespace', () => {
      expect(
        collect(
          { 'Main.xsd': makeSchema({ targetNamespace: 'urn:x', includes: ['Inc.xsd'] }), 'Inc.xsd': makeSchema() },
          'Main.xsd',
        ),
      ).toEqual({ 'Main.xsd': ['urn:x'], 'Inc.xsd': ['urn:x'] });
    });

    it('should let a chameleon redefine target adopt the redefining namespace', () => {
      expect(
        collect(
          { 'Impl.xsd': makeSchema({ targetNamespace: 'urn:x', redefines: ['Base.xsd'] }), 'Base.xsd': makeSchema() },
          'Impl.xsd',
        ),
      ).toEqual({ 'Impl.xsd': ['urn:x'], 'Base.xsd': ['urn:x'] });
    });

    it('should keep the declared namespace of an include-like target', () => {
      expect(
        collect(
          {
            'Impl.xsd': makeSchema({ targetNamespace: 'urn:x', redefines: ['Base.xsd'] }),
            'Base.xsd': makeSchema({ targetNamespace: 'urn:x' }),
          },
          'Impl.xsd',
        ),
      ).toEqual({ 'Impl.xsd': ['urn:x'], 'Base.xsd': ['urn:x'] });
    });

    it('should keep the declared namespace of an imported schema and not adopt for a no-namespace import', () => {
      expect(
        collect(
          {
            'Main.xsd': makeSchema({
              targetNamespace: 'urn:x',
              imports: [{ ns: 'urn:t', loc: 'T.xsd' }, { loc: 'NoNs.xsd' }],
            }),
            'T.xsd': makeSchema({ targetNamespace: 'urn:t' }),
            'NoNs.xsd': makeSchema(),
          },
          'Main.xsd',
        ),
      ).toEqual({ 'Main.xsd': ['urn:x'], 'T.xsd': ['urn:t'], 'NoNs.xsd': [''] });
    });

    it('should reach a chameleon schema under every namespace it is included into', () => {
      expect(
        collect(
          {
            'Entry.xsd': makeSchema({
              targetNamespace: 'urn:a',
              includes: ['Cham.xsd'],
              imports: [{ ns: 'urn:b', loc: 'Other.xsd' }],
            }),
            'Other.xsd': makeSchema({ targetNamespace: 'urn:b', includes: ['Cham.xsd'] }),
            'Cham.xsd': makeSchema(),
          },
          'Entry.xsd',
        ),
      ).toEqual({ 'Entry.xsd': ['urn:a'], 'Cham.xsd': ['urn:a', 'urn:b'], 'Other.xsd': ['urn:b'] });
    });

    it('should terminate on an include cycle', () => {
      expect(
        collect(
          {
            'A.xsd': makeSchema({ targetNamespace: 'urn:x', includes: ['B.xsd'] }),
            'B.xsd': makeSchema({ includes: ['A.xsd'] }),
          },
          'A.xsd',
        ),
      ).toEqual({ 'A.xsd': ['urn:x'], 'B.xsd': ['urn:x'] });
    });
  });
});
