import { DocumentDefinition, DocumentDefinitionType, DocumentType, IField } from '../../models/datamapper';
import { NS_XML_SCHEMA } from '../../models/datamapper/standard-namespaces';
import { FieldOverrideVariant } from '../../models/datamapper/types';
import { getChoiceWithAbstractXsd } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { SchemaPathService } from '../schema-path.service';
import { DocumentUtilService } from './document-util.service';
import { FieldOverrideService } from './field-override.service';
import { WrapperSelectionService } from './wrapper-selection.service';
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
  const short = root.fields.find((f) => f.name === 'Short');
  if (!short) throw new Error('Short field not found in Notification');
  const choice = short.fields.find((f) => f.wrapperKind === 'choice');
  if (!choice) throw new Error('Choice field not found in Short');
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

describe('WrapperSelectionService', () => {
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

      WrapperSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(1);
    });

    it('should set selection with index 0', () => {
      const choice = document.fields[0].fields[0];

      WrapperSelectionService.setChoiceSelection(document, choice, 0, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(0);
      expect(document.definition.choiceSelections?.[0].selectedMemberIndex).toBe(0);
    });

    it('should update document definition with selection', () => {
      const choice = document.fields[0].fields[0];
      const expectedPath = SchemaPathService.build(choice, namespaceMap);

      WrapperSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      expect(document.definition.choiceSelections).toBeDefined();
      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0]).toEqual({
        schemaPath: expectedPath,
        selectedMemberIndex: 1,
      });
    });

    it('should update existing selection in definition', () => {
      const choice = document.fields[0].fields[0];

      WrapperSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);
      WrapperSelectionService.setChoiceSelection(document, choice, 2, namespaceMap);

      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0].selectedMemberIndex).toBe(2);
    });

    it('should throw error for non-choice field', () => {
      const nonChoiceField = document.fields[0].fields[1];

      expect(() => {
        WrapperSelectionService.setChoiceSelection(document, nonChoiceField, 0, namespaceMap);
      }).toThrow('Field is not a choice compositor');
    });

    it('should throw error for invalid member index', () => {
      const choice = document.fields[0].fields[0];

      expect(() => {
        WrapperSelectionService.setChoiceSelection(document, choice, 99, namespaceMap);
      }).toThrow('Invalid member index');
    });

    it('should throw error for negative member index', () => {
      const choice = document.fields[0].fields[0];

      expect(() => {
        WrapperSelectionService.setChoiceSelection(document, choice, -1, namespaceMap);
      }).toThrow('Invalid member index');
    });

    it('should not invalidate sibling subtree selections', () => {
      const parentChoice = document.fields[0].fields[0];
      const container = document.fields[0].fields[1];
      const containerChoice = container.fields[0];

      WrapperSelectionService.setChoiceSelection(document, containerChoice, 0, namespaceMap);
      WrapperSelectionService.setChoiceSelection(document, parentChoice, 1, namespaceMap);

      // Container choice is in a sibling subtree — its path does not start with parentChoice's path
      expect(document.definition.choiceSelections?.length).toBe(2);
    });

    it('should preserve descendant choice selections', () => {
      const parentChoice = document.fields[0].fields[0];
      const emailMember = parentChoice.fields[0];
      const nestedChoice = emailMember.fields[0];

      WrapperSelectionService.setChoiceSelection(document, nestedChoice, 0, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(1);

      WrapperSelectionService.setChoiceSelection(document, parentChoice, 1, namespaceMap);

      // Both parent and nested selections preserved
      expect(document.definition.choiceSelections?.length).toBe(2);
      expect(nestedChoice.selectedMemberIndex).toBe(0);
    });
  });

  describe('clearChoiceSelection()', () => {
    it('should clear selection from choice field', () => {
      const choice = document.fields[0].fields[0];
      WrapperSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      WrapperSelectionService.clearChoiceSelection(document, choice, namespaceMap);

      expect(choice.selectedMemberIndex).toBeUndefined();
    });

    it('should remove selection from document definition', () => {
      const choice = document.fields[0].fields[0];
      WrapperSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      WrapperSelectionService.clearChoiceSelection(document, choice, namespaceMap);

      expect(document.definition.choiceSelections).toEqual([]);
    });

    it('should be no-op if selection already cleared', () => {
      const choice = document.fields[0].fields[0];
      choice.selectedMemberIndex = undefined;

      expect(() => {
        WrapperSelectionService.clearChoiceSelection(document, choice, namespaceMap);
      }).not.toThrow();

      expect(choice.selectedMemberIndex).toBeUndefined();
    });

    it('should throw error for non-choice field', () => {
      const nonChoiceField = document.fields[0].fields[1];

      expect(() => {
        WrapperSelectionService.clearChoiceSelection(document, nonChoiceField, namespaceMap);
      }).toThrow('Field is not a choice compositor');
    });

    it('should not invalidate sibling subtree selections on clear', () => {
      const parentChoice = document.fields[0].fields[0];
      const container = document.fields[0].fields[1];
      const containerChoice = container.fields[0];

      WrapperSelectionService.setChoiceSelection(document, parentChoice, 0, namespaceMap);
      WrapperSelectionService.setChoiceSelection(document, containerChoice, 1, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(2);

      WrapperSelectionService.clearChoiceSelection(document, parentChoice, namespaceMap);

      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0].schemaPath).toContain('Container');
    });

    it('should preserve descendant choice selections on clear', () => {
      const parentChoice = document.fields[0].fields[0];
      const emailMember = parentChoice.fields[0];
      const nestedChoice = emailMember.fields[0];

      WrapperSelectionService.setChoiceSelection(document, parentChoice, 0, namespaceMap);
      WrapperSelectionService.setChoiceSelection(document, nestedChoice, 1, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(2);

      WrapperSelectionService.clearChoiceSelection(document, parentChoice, namespaceMap);

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
        const emailQName = abstractField.selectedMemberQName;
        expect(emailQName).toBeDefined();
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);

        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution stays in both definition and live field — consistent state
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(abstractField.selectedMemberQName).toBe(emailQName);
      });

      it('should preserve descendant abstract substitution when clearing choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);
        const smsQName = abstractField.selectedMemberQName;
        expect(smsQName).toBeDefined();
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);

        WrapperSelectionService.clearChoiceSelection(doc, choiceField, nsMap);

        // Substitution preserved
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(abstractField.selectedMemberQName).toBe(smsQName);
      });

      it('should allow reverting abstract substitution after parent choice selection (issue #3234)', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        expect(abstractField.selectedMemberQName).toBeDefined();

        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution is preserved, so revert should work
        FieldOverrideService.revertFieldSubstitution(abstractField, nsMap);

        expect(abstractField.selectedMemberQName).toBeUndefined();
        expect(doc.definition.fieldSubstitutions ?? []).toHaveLength(0);
      });

      it('should allow switching substitution after choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Switch from Email to SMS
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);

        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(doc.definition.fieldSubstitutions![0].name).toBe('ca:SMS');
        expect(abstractField.selectedMemberQName?.getLocalPart()).toBe('SMS');
      });

      it('should allow revert after switching substitution across choice changes', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);

        FieldOverrideService.revertFieldSubstitution(abstractField, nsMap);

        expect(abstractField.selectedMemberQName).toBeUndefined();
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

        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
        expect(leafField.typeOverride).toBe(FieldOverrideVariant.SAFE);
      });

      it('should preserve descendant type override when clearing choice selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);

        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

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

        WrapperSelectionService.clearChoiceSelection(doc, choiceField, nsMap);

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
        WrapperSelectionService.setChoiceSelection(doc, parentChoice, 0, nsMap);
        WrapperSelectionService.setChoiceSelection(doc, nestedChoice, 1, nsMap);
        expect(nestedChoice.selectedMemberIndex).toBe(1);

        // Switch parent away from email
        WrapperSelectionService.setChoiceSelection(doc, parentChoice, 2, nsMap);

        // Switch parent back to email
        WrapperSelectionService.setChoiceSelection(doc, parentChoice, 0, nsMap);

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
        const emailQName = abstractField.selectedMemberQName;

        // Switch choice away and back
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 1, nsMap);
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution survived
        expect(abstractField.selectedMemberQName).toBe(emailQName);
        expect(doc.definition.fieldSubstitutions).toHaveLength(1);
        expect(doc.definition.fieldSubstitutions![0].name).toBe('ca:Email');
      });

      it('should preserve substitution through multiple choice changes', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);

        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:SMS', nsMap);
        const smsQName = abstractField.selectedMemberQName;

        // Multiple choice changes
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 1, nsMap);
        WrapperSelectionService.clearChoiceSelection(doc, choiceField, nsMap);
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Substitution survived all transitions
        expect(abstractField.selectedMemberQName).toBe(smsQName);
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

        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Both substitutions preserved
        expect(doc.definition.fieldSubstitutions).toHaveLength(2);
      });

      it('should not affect sibling type override outside the choice subtree', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);

        const root = doc.fields[0];
        const short = root.fields.find((f) => f.name === 'Short');
        if (!short) throw new Error('Short field not found in Notification');
        const idField = short.fields.find((f) => f.name === 'id');
        if (!idField) throw new Error('id field not found in Short');
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

        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);

        // Sibling type override should be preserved
        expect(doc.definition.fieldTypeOverrides).toHaveLength(1);
        expect(idField.typeOverride).toBe(FieldOverrideVariant.SAFE);
      });
    });
  });

  describe('wrapper field queries', () => {
    describe('resolveOutermostSelectedWrapper', () => {
      it('should return the field itself and depth 1 when no parent wrapper', () => {
        const doc = createChoiceWithAbstractDoc();
        const choiceField = findChoiceField(doc);
        choiceField.selectedMemberIndex = 0;
        const result = WrapperSelectionService.resolveOutermostSelectedWrapper(choiceField);
        expect(result.outermost).toBe(choiceField);
        expect(result.depth).toBe(1);
      });

      it('should walk up through selected parent wrappers', () => {
        const doc = createChoiceWithAbstractDoc();
        const choiceField = findChoiceField(doc);
        const inner = new XmlSchemaField(choiceField, 'innerChoice', false);
        inner.wrapperKind = 'choice';
        inner.selectedMemberIndex = 1;
        choiceField.fields.push(inner);
        choiceField.selectedMemberIndex = choiceField.fields.indexOf(inner);
        const result = WrapperSelectionService.resolveOutermostSelectedWrapper(inner);
        expect(result.outermost).toBe(choiceField);
        expect(result.depth).toBe(2);
      });

      it('should walk up through three levels of selected wrappers', () => {
        const doc = createChoiceWithAbstractDoc();
        const choiceField = findChoiceField(doc);
        const middle = new XmlSchemaField(choiceField, 'middleChoice', false);
        middle.wrapperKind = 'choice';
        choiceField.fields.push(middle);
        const inner = new XmlSchemaField(middle, 'innerChoice', false);
        inner.wrapperKind = 'choice';
        inner.selectedMemberIndex = 1;
        middle.fields.push(inner);
        middle.selectedMemberIndex = middle.fields.indexOf(inner);
        choiceField.selectedMemberIndex = choiceField.fields.indexOf(middle);
        const result = WrapperSelectionService.resolveOutermostSelectedWrapper(inner);
        expect(result.outermost).toBe(choiceField);
        expect(result.depth).toBe(3);
      });

      it('should stop when parent selects a different member', () => {
        const doc = createChoiceWithAbstractDoc();
        const choiceField = findChoiceField(doc);
        const inner = new XmlSchemaField(choiceField, 'innerChoice', false);
        inner.wrapperKind = 'choice';
        inner.selectedMemberIndex = 0;
        choiceField.fields.push(inner);
        choiceField.selectedMemberIndex = 0;
        const result = WrapperSelectionService.resolveOutermostSelectedWrapper(inner);
        expect(result.outermost).toBe(inner);
        expect(result.depth).toBe(1);
      });

      it('should stop at parent without selectedMemberIndex', () => {
        const doc = createChoiceWithAbstractDoc();
        const choiceField = findChoiceField(doc);
        const inner = new XmlSchemaField(choiceField, 'innerChoice', false);
        inner.wrapperKind = 'choice';
        inner.selectedMemberIndex = 0;
        const result = WrapperSelectionService.resolveOutermostSelectedWrapper(inner);
        expect(result.outermost).toBe(inner);
        expect(result.depth).toBe(1);
      });

      it('should return depth 1 and undefined for undefined input', () => {
        const result = WrapperSelectionService.resolveOutermostSelectedWrapper(undefined);
        expect(result.outermost).toBeUndefined();
        expect(result.depth).toBe(1);
      });
    });

    describe('shouldFlattenNestedWrapper', () => {
      it('should flatten cross-kind nesting (choice>abstract) even without inner selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);
        expect(WrapperSelectionService.shouldFlattenNestedWrapper('choice', abstractField)).toBe(true);
      });

      it('should flatten cross-kind nesting when inner has selection (choice>abstract>Email)', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);
        FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
        expect(DocumentUtilService.getSelectedMember(abstractField)).toBeDefined();
        expect(WrapperSelectionService.shouldFlattenNestedWrapper('choice', abstractField)).toBe(true);
      });

      it('should NOT flatten same-kind nesting (choice>choice) when inner has no selection', () => {
        const doc = createChoiceWithAbstractDoc();
        const choiceField = findChoiceField(doc);
        const innerChoice = new XmlSchemaField(choiceField, 'innerChoice', false);
        innerChoice.wrapperKind = 'choice';
        expect(WrapperSelectionService.shouldFlattenNestedWrapper('choice', innerChoice)).toBe(false);
      });
    });

    describe('findParentWrapper', () => {
      it('should return parent choice when abstract is inside selected choice', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
        expect(WrapperSelectionService.findParentWrapper(abstractField, 'choice')).toBe(choiceField);
      });

      it('should return undefined for standalone abstract', () => {
        const doc = createChoiceWithAbstractDoc();
        const root = doc.fields[0];
        const standaloneAbstract = new XmlSchemaField(root, 'standalone', false);
        standaloneAbstract.wrapperKind = 'abstract';
        root.fields.push(standaloneAbstract);
        expect(WrapperSelectionService.findParentWrapper(standaloneAbstract, 'choice')).toBeUndefined();
      });

      it('should return undefined when choice selects a different member', () => {
        const doc = createChoiceWithAbstractDoc();
        const nsMap = { ca: NS_CHOICE_ABSTRACT };
        const choiceField = findChoiceField(doc);
        const abstractField = findAbstractField(choiceField);
        WrapperSelectionService.setChoiceSelection(doc, choiceField, 1, nsMap);
        expect(WrapperSelectionService.findParentWrapper(abstractField, 'choice')).toBeUndefined();
      });
    });
  });

  describe('cascade clear: abstract substitution clears parent choice (#3532)', () => {
    it('should cascade abstract substitution clear to parent choice (source maxOccurs=1)', () => {
      const doc = createChoiceWithAbstractDoc();
      const nsMap = { ca: NS_CHOICE_ABSTRACT };
      const choiceField = findChoiceField(doc);
      const abstractField = findAbstractField(choiceField);

      WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
      FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
      expect(choiceField.selectedMemberIndex).toBe(0);
      expect(abstractField.selectedMemberQName).toBeDefined();

      FieldOverrideService.revertFieldSubstitution(abstractField, nsMap);
      const parentChoice = WrapperSelectionService.findParentWrapper(abstractField, 'choice');
      if (parentChoice) {
        WrapperSelectionService.clearChoiceSelection(doc, parentChoice, nsMap);
      }

      expect(choiceField.selectedMemberIndex).toBeUndefined();
      expect(abstractField.selectedMemberQName).toBeUndefined();
    });

    it('should clean up both choiceSelections and fieldSubstitutions after cascade', () => {
      const doc = createChoiceWithAbstractDoc();
      const nsMap = { ca: NS_CHOICE_ABSTRACT };
      const choiceField = findChoiceField(doc);
      const abstractField = findAbstractField(choiceField);

      WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, nsMap);
      FieldOverrideService.applyFieldSubstitution(abstractField, 'ca:Email', nsMap);
      expect(doc.definition.choiceSelections).toHaveLength(1);
      expect(doc.definition.fieldSubstitutions).toHaveLength(1);

      FieldOverrideService.revertFieldSubstitution(abstractField, nsMap);
      const parentChoice = WrapperSelectionService.findParentWrapper(abstractField, 'choice');
      if (parentChoice) {
        WrapperSelectionService.clearChoiceSelection(doc, parentChoice, nsMap);
      }

      expect(doc.definition.choiceSelections ?? []).toHaveLength(0);
      expect(doc.definition.fieldSubstitutions ?? []).toHaveLength(0);
    });
  });
});
