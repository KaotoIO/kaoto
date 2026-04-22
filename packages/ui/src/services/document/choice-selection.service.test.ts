import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../models/datamapper';
import { NS_XML_SCHEMA } from '../../models/datamapper/standard-namespaces';
import { XmlSchemaCollection } from '../../xml-schema-ts';
import { SchemaPathService } from '../schema-path.service';
import { ChoiceSelectionService } from './choice-selection.service';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema/xml-schema-document.model';

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

    it('should cascade invalidate true descendant selections', () => {
      const parentChoice = document.fields[0].fields[0];
      const emailMember = parentChoice.fields[0];
      const nestedChoice = emailMember.fields[0];

      ChoiceSelectionService.setChoiceSelection(document, nestedChoice, 0, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(1);

      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 1, namespaceMap);

      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0].schemaPath).not.toContain('email');
      expect(nestedChoice.selectedMemberIndex).toBeUndefined();
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

    it('should cascade invalidate true descendant selections on clear', () => {
      const parentChoice = document.fields[0].fields[0];
      const emailMember = parentChoice.fields[0];
      const nestedChoice = emailMember.fields[0];

      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 0, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, nestedChoice, 1, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(2);

      ChoiceSelectionService.clearChoiceSelection(document, parentChoice, namespaceMap);

      expect(document.definition.choiceSelections?.length).toBe(0);
      expect(nestedChoice.selectedMemberIndex).toBeUndefined();
    });
  });
});
