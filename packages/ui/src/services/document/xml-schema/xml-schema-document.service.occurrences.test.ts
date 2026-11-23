import {
  CreateDocumentResult,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
} from '../../../models/datamapper/document';
import {
  getMultiLevelRestrictionXsd,
  getProhibitedComponentsXsd,
  getRestrictionComplexXsd,
  getSchemaTestXsd,
  getXmlStubFile,
} from '../../../stubs/datamapper/data-mapper';
import { DocumentUtilService } from '../document-util.service';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema-document.service';

const MALFORMED_MAIN = 'MalformedOccurrences.xsd';
const MALFORMED_IMPORTED = 'MalformedOccurrencesImported.xsd';
const MALFORMED_COMMON = 'MalformedOccurrencesCommon.xsd';

function malformedFiles(): Record<string, string> {
  return {
    [MALFORMED_MAIN]: getXmlStubFile(`malformed-occurrences/${MALFORMED_MAIN}`),
    [MALFORMED_IMPORTED]: getXmlStubFile(`malformed-occurrences/${MALFORMED_IMPORTED}`),
    [MALFORMED_COMMON]: getXmlStubFile(`malformed-occurrences/${MALFORMED_COMMON}`),
  };
}

function createDocument(files: Record<string, string>): CreateDocumentResult {
  const definition = new DocumentDefinition(
    DocumentType.TARGET_BODY,
    DocumentDefinitionType.XML_SCHEMA,
    'occurrences',
    files,
  );
  return XmlSchemaDocumentService.createXmlSchemaDocument(definition);
}

function loadDocument(files: Record<string, string>): XmlSchemaDocument {
  const result = createDocument(files);
  expect(result.validationStatus).not.toBe('error');
  return result.document as XmlSchemaDocument;
}

function child(parent: IField, name: string): XmlSchemaField {
  const found = DocumentUtilService.resolveTypeFragment(parent).fields.find((f) => f.name === name);
  if (!(found instanceof XmlSchemaField)) {
    throw new TypeError(`"${parent.name}" has no XML Schema child "${name}"`);
  }
  return found;
}

function childNames(field: IField): string[] {
  return DocumentUtilService.resolveTypeFragment(field).fields.map((f) => f.name);
}

describe('XmlSchemaDocumentService / occurrence values', () => {
  describe('use="prohibited" attributes', () => {
    let root: IField;

    beforeEach(() => {
      const document = loadDocument({ 'ProhibitedComponents.xsd': getProhibitedComponentsXsd() });
      root = document.fields[0];
    });

    it.each([
      ['RestrictedPlain', ['keep']],
      ['ChainTop', ['keep']],
      ['SimpleChainTop', ['keep']],
      ['ProhibitedViaGroup', ['keep']],
      ['BaseGroupRestricted', ['keep']],
      ['ProhibitedByRef', ['keep']],
      ['ProhibitedByName', ['keep']],
      ['RestrictedExtension', ['keep', 'drop', 'extKeep']],
    ])('should leave out the attribute that %s prohibits, also when it is inherited', (typeName, expected) => {
      expect(childNames(child(root, typeName))).toEqual(expected);
    });

    it('should keep an unqualified attribute when a restriction prohibits a qualified one with the same local name', () => {
      const fields = DocumentUtilService.resolveTypeFragment(child(root, 'UnqualifiedSameName')).fields;

      expect(fields.map((f) => [f.name, f.namespaceURI ?? ''])).toEqual([
        ['keep', ''],
        ['qattr', ''],
      ]);
    });

    it('should keep an attribute that an extension adds back after its base restriction prohibited it', () => {
      const drop = child(child(root, 'ReAdded'), 'drop');

      expect(drop.isAttribute).toBe(true);
      expect(drop.minOccurs).toBe(1);
      expect(drop.maxOccurs).toBe(1);
    });

    it('should not let an extension remove inherited components, and leave out its own forbidden ones', () => {
      expect(childNames(child(root, 'ExtensionOwnAttributes'))).toEqual(['keep', 'drop']);
      expect(childNames(child(root, 'ExtensionOwnElements'))).toEqual(['a', 'b', 'c', 'kept']);
    });

    it('should not create a field for a prohibited attribute outside any derivation', () => {
      const document = loadDocument({ 'SchemaTest.xsd': getSchemaTestXsd() });
      const personType = Object.values(document.namedTypeFragments).find((fragment) =>
        fragment.fields.some((f) => f.name === 'version' && f.isAttribute),
      );

      expect(personType?.fields.some((f) => f.name === 'status')).toBe(false);
    });
  });

  describe('maxOccurs="0" particles', () => {
    let root: IField;

    beforeEach(() => {
      const document = loadDocument({ 'ProhibitedComponents.xsd': getProhibitedComponentsXsd() });
      root = document.fields[0];
    });

    it('should leave out zeroed choices, sequences, group references and abstract references with their members', () => {
      const zeroedGroups = child(root, 'ZeroedGroups');
      const fields = DocumentUtilService.resolveTypeFragment(zeroedGroups).fields;

      expect(fields.map((f) => f.name)).toEqual(['kept1', '__choice__', 'kept2']);
      expect(fields[1].fields.map((f) => f.name)).toEqual(['ca']);
    });

    it('should leave out a zeroed xs:all or group reference that is the type particle', () => {
      expect(childNames(child(root, 'ZeroedAll'))).toEqual(['keep']);
      expect(childNames(child(root, 'ZeroedGroupRefParticle'))).toEqual(['keep']);
    });

    it('should keep the remaining choice alternatives in order after a zeroed one', () => {
      const choice = DocumentUtilService.resolveTypeFragment(child(root, 'ZeroedFirstAlternative')).fields[0];

      expect(choice.wrapperKind).toBe('choice');
      expect(choice.fields.map((f) => f.name)).toEqual(['alt1', 'alt2']);
    });

    it('should leave out an element a restriction zeroes, also when the restriction is extended', () => {
      expect(childNames(child(root, 'ExtendedZeroed'))).toEqual(['a', 'c', 'd']);
      expect(childNames(child(root, 'ZeroedMiddle'))).toEqual(['keep', 'first', 'last']);
    });
  });

  describe('malformed occurrence values', () => {
    it('should load with one warning per malformed value, under the file that holds it', () => {
      const result = createDocument(malformedFiles());

      expect(result.validationStatus).toBe('warning');
      expect(result.warnings).toEqual([
        {
          message: 'Invalid maxOccurs value "abc" on xs:element name="NotANumber"; the default 1 is used.',
          filePath: MALFORMED_MAIN,
        },
        {
          message: 'Invalid minOccurs value "-1" on xs:element name="Negative"; the default 1 is used.',
          filePath: MALFORMED_MAIN,
        },
        {
          message: 'Invalid maxOccurs value "3abc" on xs:element name="TrailingText"; the default 1 is used.',
          filePath: MALFORMED_MAIN,
        },
        {
          message: 'Invalid maxOccurs value "many" on xs:choice; the default 1 is used.',
          filePath: MALFORMED_IMPORTED,
        },
        {
          message: 'Invalid maxOccurs value "1.5" on xs:element ref="imp:Referenced"; the default 1 is used.',
          filePath: MALFORMED_IMPORTED,
        },
        {
          message: 'Invalid maxOccurs value "2.0" on xs:element name="Item"; the default 1 is used.',
          filePath: MALFORMED_COMMON,
        },
      ]);
    });

    it('should give the affected fields the default occurrences', () => {
      const root = loadDocument(malformedFiles()).fields[0];

      for (const name of ['NotANumber', 'Negative', 'TrailingText']) {
        const field = child(root, name);
        expect([field.minOccurs, field.maxOccurs]).toEqual([1, 1]);
        expect([field.minOccursExplicit, field.maxOccursExplicit]).toEqual([false, false]);
      }

      const imported = child(root, 'Imported');
      const choice = DocumentUtilService.resolveTypeFragment(imported).fields[0];
      expect(choice).toBeInstanceOf(XmlSchemaField);
      expect(choice.wrapperKind).toBe('choice');
      expect([choice.minOccurs, choice.maxOccurs]).toEqual([1, 1]);
      const choiceField = choice as XmlSchemaField;
      expect([choiceField.minOccursExplicit, choiceField.maxOccursExplicit]).toEqual([false, false]);

      for (const field of [child(imported, 'Referenced'), child(child(root, 'Common'), 'Item')]) {
        expect([field.minOccurs, field.maxOccurs]).toEqual([1, 1]);
        expect([field.minOccursExplicit, field.maxOccursExplicit]).toEqual([false, false]);
      }
    });
  });

  describe('no field carries maxOccurs 0 or NaN', () => {
    function collectFields(document: XmlSchemaDocument): IField[] {
      const all: IField[] = [];
      const visit = (fields: IField[]) => {
        for (const field of fields) {
          all.push(field);
          visit(field.fields);
        }
      };
      visit(document.fields);
      for (const fragment of Object.values(document.namedTypeFragments)) {
        visit(fragment.fields);
      }
      return all;
    }

    it.each([
      ['ProhibitedComponents.xsd', () => ({ 'ProhibitedComponents.xsd': getProhibitedComponentsXsd() })],
      ['the malformed set', malformedFiles],
      ['RestrictionComplex.xsd', () => ({ 'RestrictionComplex.xsd': getRestrictionComplexXsd() })],
      ['SchemaTest.xsd', () => ({ 'SchemaTest.xsd': getSchemaTestXsd() })],
      ['MultiLevelRestriction.xsd', () => ({ 'MultiLevelRestriction.xsd': getMultiLevelRestrictionXsd() })],
    ])('in %s', (_label, files) => {
      const fields = collectFields(loadDocument(files()));

      expect(fields.length).toBeGreaterThan(0);
      for (const field of fields) {
        expect(field.maxOccurs).not.toBe(0);
        expect(Number.isNaN(field.maxOccurs)).toBe(false);
        expect(Number.isNaN(field.minOccurs)).toBe(false);
      }
    });
  });
});
