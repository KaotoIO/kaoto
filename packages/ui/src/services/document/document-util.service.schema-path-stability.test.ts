import { describe, expect, it } from 'vitest';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  Types,
} from '../../models/datamapper';
import { IFieldTypeOverride } from '../../models/datamapper/metadata';
import { NS_XML_SCHEMA } from '../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { SchemaPathService } from '../schema-path.service';
import { DocumentUtilService } from './document-util.service';
import { XmlSchemaField } from './xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema/xml-schema-document.service';
import { XmlSchemaTypesService } from './xml-schema/xml-schema-types.service';

/**
 * Pins the schema-path behaviour that persisted overrides depend on, ahead of the wrapper-kind
 * refactoring. Overrides are addressed by an exact `schemaPath` string, and `getSiblingIndex`
 * numbers wrapper segments by position among same-kind siblings — so both the path format and
 * the parser's child ordering are load-bearing for override restoration, and neither is
 * currently covered. These are characterisation tests: they record what happens today so that
 * a refactor which changes it fails loudly rather than silently.
 *
 * Deliberately absent: an assertion that a persisted override at a renumbered path is silently
 * discarded. That is a real defect and this fixture reproduces it, but such an assertion inverts
 * when the defect is fixed, and the fix is owned by a separate bug issue rather than by the
 * refactoring this file precedes. It lands with that fix, so the red test arrives for someone
 * who is reading the issue that explains it.
 */
describe('DocumentUtilService — schema path stability for persisted overrides', () => {
  const namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test', xs: NS_XML_SCHEMA };

  const buildDocWithChoice = () => {
    const doc = TestUtil.createSourceOrderDoc();
    const shipOrder = doc.fields[0];
    const originalChoice = new XmlSchemaField(shipOrder, 'choice', false);
    originalChoice.wrapperKind = 'choice';
    const emailField = new XmlSchemaField(originalChoice, 'email', false);
    emailField.type = Types.String;
    originalChoice.fields = [emailField];
    shipOrder.fields.push(originalChoice);
    return { doc, shipOrder, originalChoice, emailField };
  };

  it('addresses a field inside a choice wrapper with a {choice:N} segment', () => {
    const { originalChoice, emailField } = buildDocWithChoice();

    expect(SchemaPathService.build(originalChoice, namespaceMap)).toBe('/ns0:ShipOrder/{choice:0}');
    expect(SchemaPathService.build(emailField, namespaceMap)).toBe('/ns0:ShipOrder/{choice:0}/email');
  });

  it('renumbers a choice segment when a sibling choice is inserted before it', () => {
    const { shipOrder, originalChoice, emailField } = buildDocWithChoice();

    const insertedChoice = new XmlSchemaField(shipOrder, 'choice', false);
    insertedChoice.wrapperKind = 'choice';
    shipOrder.fields.splice(shipOrder.fields.indexOf(originalChoice), 0, insertedChoice);

    expect(SchemaPathService.build(originalChoice, namespaceMap)).toBe('/ns0:ShipOrder/{choice:1}');
    expect(SchemaPathService.build(emailField, namespaceMap)).toBe('/ns0:ShipOrder/{choice:1}/email');
  });

  it('applies a type override addressed through a choice wrapper segment', () => {
    const { doc, emailField } = buildDocWithChoice();

    const overrides: IFieldTypeOverride[] = [
      {
        schemaPath: SchemaPathService.build(emailField, namespaceMap),
        type: 'xs:int',
        originalType: 'xs:string',
        variant: FieldOverrideVariant.FORCE,
      },
    ];

    DocumentUtilService.processTypeOverrides(doc, overrides, namespaceMap, XmlSchemaTypesService.parseTypeOverride);

    expect(emailField.type).toBe(Types.Integer);
    expect(emailField.typeOverride).toBe(FieldOverrideVariant.FORCE);
  });

  describe('parsed from real XSDs rather than hand-built fields', () => {
    const xsd = (choices: string) => `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           xmlns:tns="io.kaoto.datamapper.poc.test"
           targetNamespace="io.kaoto.datamapper.poc.test"
           elementFormDefault="qualified">
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>${choices}</xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

    const EMAIL_CHOICE = `
        <xs:choice>
          <xs:element name="email" type="xs:string"/>
          <xs:element name="phone" type="xs:string"/>
        </xs:choice>`;
    const INSERTED_CHOICE = `
        <xs:choice>
          <xs:element name="fax" type="xs:string"/>
          <xs:element name="telex" type="xs:string"/>
        </xs:choice>`;

    const parse = (choices: string) => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'choices.xsd': xsd(choices) },
      );
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      if (result.validationStatus !== 'success' || !result.document) {
        throw new Error(result.errors?.map((e) => e.message).join('; ') ?? 'failed to parse');
      }
      return result.document;
    };

    it('emits choice wrappers in document order, so segment indices follow the schema', () => {
      const wrappersBefore = parse(EMAIL_CHOICE).fields[0].fields.filter((f) => f.wrapperKind === 'choice');
      const wrappersAfter = parse(INSERTED_CHOICE + EMAIL_CHOICE).fields[0].fields.filter(
        (f) => f.wrapperKind === 'choice',
      );

      expect(wrappersBefore).toHaveLength(1);
      expect(wrappersAfter).toHaveLength(2);
      expect(wrappersAfter[0].fields.map((f) => f.name)).toEqual(['fax', 'telex']);
      expect(wrappersAfter[1].fields.map((f) => f.name)).toEqual(['email', 'phone']);
    });
  });
});
