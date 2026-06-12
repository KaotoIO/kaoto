import { DocumentDefinition, DocumentDefinitionType, DocumentType, IField } from '../../models/datamapper';
import { NS_XML_SCHEMA } from '../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import { getChoiceWithAbstractXsd } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { SchemaPathService } from '../schema-path.service';
import { ChoiceSelectionService } from './choice-selection.service';
import { FieldOverrideService } from './field-override.service';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from './xml-schema/xml-schema-document.service';

const NS_CHOICE_ABSTRACT = 'http://www.example.com/CHOICE_ABSTRACT';

function createChoiceWithAbstractDoc() {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
    'ChoiceWithAbstract.xsd': getChoiceWithAbstractXsd(),
  });
  definition.rootElementChoice = { namespaceUri: NS_CHOICE_ABSTRACT, name: 'Notification' };
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(
      result.errors?.map((e) => e.message).join('; ') || 'Failed to create choice+abstract test document',
    );
  }
  return result.document;
}

function findChoiceField(doc: XmlSchemaDocument): XmlSchemaField {
  const root = doc.fields[0];
  const choice = root.fields.find((f) => f.wrapperKind === 'choice');
  if (!choice) throw new Error('Choice field not found in Notification');
  return choice;
}

function findAbstractField(choiceField: IField): XmlSchemaField {
  const abstract = choiceField.fields.find((f) => f.wrapperKind === 'abstract');
  if (!abstract) throw new Error('Abstract field not found inside choice');
  return abstract as XmlSchemaField;
}

function findDescendantLeaf(field: IField): IField {
  let current = field;
  while (current.fields.length > 0) {
    current = current.fields[0];
  }
  return current;
}

describe('ChoiceSelectionService', () => {
  let document: XmlSchemaDocument;
  let namespaceMap: Record<string, string>;

  function makeChoiceField(parent: XmlSchemaField, memberNames: string[]): XmlSchemaField {
    const choiceField = new XmlSchemaField(parent, 'choice', false);
    choiceField.wrapperKind = 'choice';
    choiceField.fields = memberNames.map((name) => {
      const member = new XmlSchemaField(choiceField, name, false);
      return member;
    });
    return choiceField;
  }

  /**
   * Test document structure:
   *
   * Root (ns0)
   * +-- {choice:0} [email, phone, fax]
   * |   +-- email (ns0)
   * |       +-- {choice:0} [work, personal]    <-- true descendant of Root/{choice:0}
   * +-- Container (ns0)
   * |   +-- {choice:0} [option1, option2]      <-- sibling subtree, NOT descendant of Root/{choice:0}
   * +-- {choice:1} [address, location]
   */
  function createTestDocumentWithChoices(): XmlSchemaDocument {
    const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc');

    const xmlSchemaCollection = new XmlSchemaCollection();
    const doc = new XmlSchemaDocument(definition, xmlSchemaCollection);
    const root = new XmlSchemaField(doc, 'Root', false);
    root.namespaceURI = 'io.kaoto.test';

    const choice1 = makeChoiceField(root, ['email', 'phone', 'fax']);
    root.fields.push(choice1);

    const container = new XmlSchemaField(root, 'Container', false);
    container.namespaceURI = 'io.kaoto.test';
    const choice2 = makeChoiceField(container, ['option1', 'option2']);
    container.fields.push(choice2);
    root.fields.push(container);

    const choice3 = makeChoiceField(root, ['address', 'location']);
    root.fields.push(choice3);

    // Nested choice inside choice1's "email" member (true descendant)
    const emailMember = choice1.fields[0];
    emailMember.namespaceURI = 'io.kaoto.test';
    const nestedChoice = makeChoiceField(emailMember, ['work', 'personal']);
    emailMember.fields.push(nestedChoice);

    doc.fields.push(root);
    doc.totalFieldCount = 10;

    return doc;
  }

  beforeEach(() => {
    document = createTestDocumentWithChoices();
    namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.test' };
  });

  describe('setChoiceSelection()', () => {
    it('should set selection on choice field', () => {
      const choice = document.fields[0].fields[0];

      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(1);
    });

    it('should set selection with index 0', () => {
      const choice = document.fields[0].fields[0];

      ChoiceSelectionService.setChoiceSelection(document, choice, 0, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(0);
      expect(document.definition.choiceSelections?.[0].selectedMemberIndex).toBe(0);
    });

    it('should update document definition with selection', () => {
      const choice = document.fields[0].fields[0];
      const expectedPath = SchemaPathService.build(choice, namespaceMap);

      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      expect(document.definition.choiceSelections).toBeDefined();
      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0]).toEqual({
        schemaPath: expectedPath,
        selectedMemberIndex: 1,
      });
    });

    it('should update existing selection in definition', () => {
      const choice = document.fields[0].fields[0];

      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, choice, 2, namespaceMap);

      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0].selectedMemberIndex).toBe(2);
    });

    it('should throw error for non-choice field', () => {
      const nonChoiceField = document.fields[0].fields[1];

      expect(() => {
        ChoiceSelectionService.setChoiceSelection(document, nonChoiceField, 0, namespaceMap);
      }).toThrow('Field is not a choice compositor');
    });

    it('should throw error for invalid member index', () => {
      const choice = document.fields[0].fields[0];

      expect(() => {
        ChoiceSelectionService.setChoiceSelection(document, choice, 99, namespaceMap);
      }).toThrow('Invalid member index');
    });

    it('should throw error for negative member index', () => {
      const choice = document.fields[0].fields[0];

      expect(() => {
        ChoiceSelectionService.setChoiceSelection(document, choice, -1, namespaceMap);
      }).toThrow('Invalid member index');
    });

    it('should not invalidate sibling subtree selections', () => {
      const parentChoice = document.fields[0].fields[0];
      const container = document.fields[0].fields[1];
      const containerChoice = container.fields[0];

      ChoiceSelectionService.setChoiceSelection(document, containerChoice, 0, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 1, namespaceMap);

      // Container choice is in a sibling subtree — its path does not start with parentChoice's path
      expect(document.definition.choiceSelections?.length).toBe(2);
    });

    it('should preserve descendant choice selections', () => {
      const parentChoice = document.fields[0].fields[0];
      const emailMember = parentChoice.fields[0];
      const nestedChoice = emailMember.fields[0];

      ChoiceSelectionService.setChoiceSelection(document, nestedChoice, 0, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(1);

      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 1, namespaceMap);

      // Both parent and nested selections preserved
      expect(document.definition.choiceSelections?.length).toBe(2);
      expect(nestedChoice.selectedMemberIndex).toBe(0);
    });
  });

  describe('clearChoiceSelection()', () => {
    it('should clear selection from choice field', () => {
      const choice = document.fields[0].fields[0];
      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      ChoiceSelectionService.clearChoiceSelection(document, choice, namespaceMap);

      expect(choice.selectedMemberIndex).toBeUndefined();
    });

    it('should remove selection from document definition', () => {
      const choice = document.fields[0].fields[0];
      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      ChoiceSelectionService.clearChoiceSelection(document, choice, namespaceMap);

      expect(document.definition.choiceSelections).toEqual([]);
    });

    it('should be no-op if selection already cleared', () => {
      const choice = document.fields[0].fields[0];
      choice.selectedMemberIndex = undefined;

      expect(() => {
        ChoiceSelectionService.clearChoiceSelection(document, choice, namespaceMap);
      }).not.toThrow();

      expect(choice.selectedMemberIndex).toBeUndefined();
    });

    it('should throw error for non-choice field', () => {
      const nonChoiceField = document.fields[0].fields[1];

      expect(() => {
        ChoiceSelectionService.clearChoiceSelection(document, nonChoiceField, namespaceMap);
      }).toThrow('Field is not a choice compositor');
    });

    it('should not invalidate sibling subtree selections on clear', () => {
      const parentChoice = document.fields[0].fields[0];
      const container = document.fields[0].fields[1];
      const containerChoice = container.fields[0];

      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 0, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, containerChoice, 1, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(2);

      ChoiceSelectionService.clearChoiceSelection(document, parentChoice, namespaceMap);

      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0].schemaPath).toContain('Container');
    });

    it('should preserve descendant choice selections on clear', () => {
      const parentChoice = document.fields[0].fields[0];
      const emailMember = parentChoice.fields[0];
      const nestedChoice = emailMember.fields[0];

      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 0, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, nestedChoice, 1, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(2);

      ChoiceSelectionService.clearChoiceSelection(document, parentChoice, namespaceMap);

      // Nested selection preserved
      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(nestedChoice.selectedMemberIndex).toBe(1);
    });
  });

  describe('choice + descendant override interaction (issue #3234)', () => {
    describe('abstract substitution preserved across choice changes', () => {
      it('should preserve descendant abstract substitution when setting choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        const emailIndex = abstractField.selectedMemberIndex;
        expect(emailIndex).toBeDefined();
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);

        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution stays in both definition and live field — consistent state
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(abstractField.selectedMemberIndex).toBe(emailIndex);
      });

      it('should preserve descendant abstract substitution when clearing choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);
        const smsIndex = abstractField.selectedMemberIndex;
        expect(smsIndex).toBeDefined();
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);

        ChoiceSelectionService.clearChoiceSelection(doc, choiceField, nsMap);

        // Substitution preserved
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(abstractField.selectedMemberIndex).toBe(smsIndex);
      });

      it('should allow reverting abstract substitution after parent choice selection (issue #3234)', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        expect(abstractField.selectedMemberIndex).toBeDefined();

        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution is preserved, so revert should work
        FieldOverrideService.revertFieldSubstitution(abstractField, nsMap);

        expect(abstractField.selectedMemberIndex).toBeUndefined();
        expect(doc.definition.fieldSubstitutions ?? []).toHaveLength(0);
      });

      it('should allow switching substitution after choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Switch from Email to SMS
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);

        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(doc.definition.fieldSubstitutions![0].name).toBe('ca:SMS');
        const smsIndex = abstractField.fields.findIndex((f) => f.name === 'SMS');
        expect(abstractField.selectedMemberIndex).toBe(smsIndex);
      });

      it('should allow revert after switching substitution across choice changes', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);

        FieldOverrideService.revertFieldSubstitution(abstractField, nsMap);

        expect(abstractField.selectedMemberIndex).toBeUndefined();
        expect(doc.definition.fieldSubstitutions).toHaveLength(0);
      });
    });

    describe('type override preserved across choice changes', () => {
      it('should preserve descendant type override when setting choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);

        const firstMember = choiceField.fields[0];
        const leafField = findDescendantLeaf(firstMember);

        const leafPath = SchemaPathService.build(leafField, nsMap);
        leafField.typeOverride = FieldOverrideVariant.SAFE;
        leafField.originalField = {
          name: leafField.name,
          displayName: leafField.name,
          namespaceURI: '',
          namespacePrefix: null,
          type: leafField.type,
          typeQName: null,
          namedTypeFragmentRefs: [],
        };
        doc.definition.fieldTypeOverrides = [
          { schemaPath: leafPath, type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.SAFE },
        ];

        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
        expect(leafField.typeOverride).toBe(FieldOverrideVariant.SAFE);
      });

      it('should preserve descendant type override when clearing choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);

        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        const firstMember = choiceField.fields[0];
        const leafField = findDescendantLeaf(firstMember);

        const leafPath = SchemaPathService.build(leafField, nsMap);
        leafField.typeOverride = FieldOverrideVariant.SAFE;
        leafField.originalField = {
          name: leafField.name,
          displayName: leafField.name,
          namespaceURI: '',
          namespacePrefix: null,
          type: leafField.type,
          typeQName: null,
          namedTypeFragmentRefs: [],
        };
        doc.definition.fieldTypeOverrides = [
          { schemaPath: leafPath, type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.SAFE },
        ];

        ChoiceSelectionService.clearChoiceSelection(doc, choiceField, nsMap);

        expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
        expect(leafField.typeOverride).toBe(FieldOverrideVariant.SAFE);
      });
    });

    describe('round-trip — overrides survive choice switch and switch-back (issue #3232)', () => {
      it('should preserve nested choice selection across parent choice round-trip', () => {
        const doc = createTestDocumentWithChoices();
        const nsMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.test' };
        const parentChoice = doc.fields[0].fields[0]; // [email, phone, fax]
        const emailMember = parentChoice.fields[0];
        const nestedChoice = emailMember.fields[0]; // [work, personal]

        // Select nested choice inside email
        ChoiceSelectionService.setChoiceSelection(doc, parentChoice, 0, nsMap);
        ChoiceSelectionService.setChoiceSelection(doc, nestedChoice, 1, nsMap);
        expect(nestedChoice.selectedMemberIndex).toBe(1);

        // Switch parent away from email
        ChoiceSelectionService.setChoiceSelection(doc, parentChoice, 2, nsMap);

        // Switch parent back to email
        ChoiceSelectionService.setChoiceSelection(doc, parentChoice, 0, nsMap);

        // Nested selection survived the round-trip
        expect(nestedChoice.selectedMemberIndex).toBe(1);
        expect(doc.definition.choiceSelections?.length).toBe(2);
      });

      it('should preserve substitution across parent choice round-trip', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        // Select substitution
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        const emailIndex = abstractField.selectedMemberIndex;

        // Switch choice away and back
        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 1, nsMap);
        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution survived
        expect(abstractField.selectedMemberIndex).toBe(emailIndex);
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(doc.definition.fieldSubstitutions![0].name).toBe('ca:Email');
      });

      it('should preserve substitution through multiple choice changes', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);
        const smsIndex = abstractField.selectedMemberIndex;

        // Multiple choice changes
        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 1, nsMap);
        ChoiceSelectionService.clearChoiceSelection(doc, choiceField, nsMap);
        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution survived all transitions
        expect(abstractField.selectedMemberIndex).toBe(smsIndex);
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
      });
    });

    describe('negative cases — sibling overrides preserved', () => {
      it('should preserve all substitutions — both descendant and sibling — on choice change', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);

        // Manually add a sibling substitution entry (simulating another abstract field outside this choice)
        const siblingPath = '/ca:Notification/ca:SiblingAbstract';
        doc.definition.fieldSubstitutions!.push({
          schemaPath: siblingPath,
          name: 'ca:SiblingType',
          originalName: 'ca:SiblingAbstract',
        });
        expect(doc.definition.fieldSubstitutions).toHaveLength(2);

        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Both substitutions preserved
        expect(doc.definition.fieldSubstitutions).toHaveLength(2);
      });

      it('should not affect sibling type override outside the choice subtree', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);

        // Manually add a type override for a sibling field (id field, outside the choice)
        const root = doc.fields[0];
        const idField = root.fields.find((f) => f.name === 'id');
        if (!idField) throw new Error('id field not found');
        const idPath = SchemaPathService.build(idField, nsMap);
        idField.typeOverride = FieldOverrideVariant.SAFE;
        idField.originalField = {
          name: idField.name,
          displayName: idField.name,
          namespaceURI: '',
          namespacePrefix: null,
          type: idField.type,
          typeQName: null,
          namedTypeFragmentRefs: [],
        };
        doc.definition.fieldTypeOverrides = [
          { schemaPath: idPath, type: 'xs:int', originalType: 'xs:string', variant: FieldOverrideVariant.SAFE },
        ];

        ChoiceSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Sibling type override should be preserved
        expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
        expect(idField.typeOverride).toBe(FieldOverrideVariant.SAFE);
      });
    });
  });
});
