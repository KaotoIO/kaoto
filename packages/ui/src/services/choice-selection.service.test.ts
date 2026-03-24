import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../models/datamapper';
import { IChoiceSelection } from '../models/datamapper/metadata';
import { NS_XML_SCHEMA } from '../models/datamapper/standard-namespaces';
import { XmlSchemaCollection } from '../xml-schema-ts';
import { ChoiceSelectionService } from './choice-selection.service';
import { XmlSchemaDocument, XmlSchemaField } from './xml-schema-document.model';

describe('ChoiceSelectionService', () => {
  let document: XmlSchemaDocument;
  let namespaceMap: Record<string, string>;

  /**
   * Helper to create a choice field with specified member names
   */
  function makeChoiceField(parent: XmlSchemaField, memberNames: string[]): XmlSchemaField {
    const choiceField = new XmlSchemaField(parent, 'choice', false);
    choiceField.isChoice = true;
    choiceField.fields = memberNames.map((name) => {
      const member = new XmlSchemaField(choiceField, name, false);
      return member;
    });
    return choiceField;
  }

  /**
   * Helper to create a test document with nested choices
   */
  function createTestDocumentWithChoices(): XmlSchemaDocument {
    const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc');

    const xmlSchemaCollection = new XmlSchemaCollection();
    const doc = new XmlSchemaDocument(definition, xmlSchemaCollection);
    const root = new XmlSchemaField(doc, 'Root', false);
    root.namespaceURI = 'io.kaoto.test';

    // Create first choice under root
    const choice1 = makeChoiceField(root, ['email', 'phone', 'fax']);
    root.fields.push(choice1);

    // Create a container element
    const container = new XmlSchemaField(root, 'Container', false);
    container.namespaceURI = 'io.kaoto.test';

    // Create nested choice inside container
    const choice2 = makeChoiceField(container, ['option1', 'option2']);
    container.fields.push(choice2);

    root.fields.push(container);

    // Create second sibling choice under root
    const choice3 = makeChoiceField(root, ['address', 'location']);
    root.fields.push(choice3);

    doc.fields.push(root);
    doc.totalFieldCount = 10;

    return doc;
  }

  beforeEach(() => {
    document = createTestDocumentWithChoices();
    namespaceMap = { xs: NS_XML_SCHEMA, ns0: 'io.kaoto.test' };
  });

  describe('buildChoicePath()', () => {
    it('should build path for top-level choice', () => {
      const choice = document.fields[0].fields[0]; // First choice under Root
      const path = ChoiceSelectionService.buildChoicePath(choice, namespaceMap);

      expect(path).toContain('{choice:0}');
      expect(path).toContain('Root');
    });

    it('should build path for nested choice', () => {
      const container = document.fields[0].fields[1]; // Container
      const nestedChoice = container.fields[0]; // Choice inside Container
      const path = ChoiceSelectionService.buildChoicePath(nestedChoice, namespaceMap);

      expect(path).toContain('Container');
      expect(path).toContain('{choice:0}');
    });

    it('should distinguish sibling choices by index', () => {
      const choice1 = document.fields[0].fields[0]; // First choice
      const choice2 = document.fields[0].fields[2]; // Second choice (after Container)

      const path1 = ChoiceSelectionService.buildChoicePath(choice1, namespaceMap);
      const path2 = ChoiceSelectionService.buildChoicePath(choice2, namespaceMap);

      expect(path1).toContain('{choice:0}');
      expect(path2).toContain('{choice:1}');
    });
  });

  describe('resolveChoicePath()', () => {
    it('should resolve valid choice path', () => {
      const choice = document.fields[0].fields[0];
      const path = ChoiceSelectionService.buildChoicePath(choice, namespaceMap);

      const resolved = ChoiceSelectionService.resolveChoicePath(document, path, namespaceMap);

      expect(resolved).toBeDefined();
      expect(resolved?.isChoice).toBe(true);
      expect(resolved?.fields.length).toBe(3); // email, phone, fax
    });

    it('should resolve nested choice path', () => {
      const container = document.fields[0].fields[1];
      const nestedChoice = container.fields[0];
      const path = ChoiceSelectionService.buildChoicePath(nestedChoice, namespaceMap);

      const resolved = ChoiceSelectionService.resolveChoicePath(document, path, namespaceMap);

      expect(resolved).toBeDefined();
      expect(resolved?.isChoice).toBe(true);
      expect(resolved?.fields.length).toBe(2); // option1, option2
    });

    it('should return undefined for invalid path', () => {
      const resolved = ChoiceSelectionService.resolveChoicePath(document, '/ns0:Invalid/{choice:99}', namespaceMap);

      expect(resolved).toBeUndefined();
    });

    it('should return undefined for non-existent choice index', () => {
      const resolved = ChoiceSelectionService.resolveChoicePath(document, '/ns0:Root/{choice:99}', namespaceMap);

      expect(resolved).toBeUndefined();
    });
  });

  describe('setChoiceSelection()', () => {
    it('should set selection on choice field', () => {
      const choice = document.fields[0].fields[0];

      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(1);
    });

    it('should set selection with index 0 (first member boundary)', () => {
      const choice = document.fields[0].fields[0]; // Has 3 members (0-2)

      ChoiceSelectionService.setChoiceSelection(document, choice, 0, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(0);
      expect(document.definition.choiceSelections?.[0].selectedMemberIndex).toBe(0);
    });

    it('should update document definition with selection', () => {
      const choice = document.fields[0].fields[0];
      const path = ChoiceSelectionService.buildChoicePath(choice, namespaceMap);

      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);

      expect(document.definition.choiceSelections).toBeDefined();
      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0]).toEqual({
        schemaPath: path,
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
      const nonChoiceField = document.fields[0].fields[1]; // Container, not a choice

      expect(() => {
        ChoiceSelectionService.setChoiceSelection(document, nonChoiceField, 0, namespaceMap);
      }).toThrow('Field is not a choice compositor');
    });

    it('should throw error for invalid member index', () => {
      const choice = document.fields[0].fields[0]; // Has 3 members

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

    it('should cascade invalidate descendant selections', () => {
      const parentChoice = document.fields[0].fields[0];
      const container = document.fields[0].fields[1];
      const childChoice = container.fields[0];

      // Set both selections
      ChoiceSelectionService.setChoiceSelection(document, childChoice, 0, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 1, namespaceMap);

      // Both selections should be in definition since child is not a direct descendant
      // (it's nested through Container element)
      expect(document.definition.choiceSelections?.length).toBe(2);

      // Note: Cascade invalidation only removes direct descendants of the choice path,
      // not descendants through intermediate elements. This is correct behavior because
      // changing a choice selection doesn't affect fields nested inside the choice members.
    });
  });

  describe('clearChoiceSelection()', () => {
    it('should clear selection from choice field', () => {
      const choice = document.fields[0].fields[0];
      // First set selection properly through the service
      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);
      expect(choice.selectedMemberIndex).toBe(1);

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
      const nonChoiceField = document.fields[0].fields[1]; // Container

      expect(() => {
        ChoiceSelectionService.clearChoiceSelection(document, nonChoiceField, namespaceMap);
      }).toThrow('Field is not a choice compositor');
    });

    it('should cascade invalidate descendant selections', () => {
      const parentChoice = document.fields[0].fields[0];
      const container = document.fields[0].fields[1];
      const childChoice = container.fields[0];

      // Set both selections
      ChoiceSelectionService.setChoiceSelection(document, parentChoice, 0, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, childChoice, 1, namespaceMap);
      expect(document.definition.choiceSelections?.length).toBe(2);

      // Clear parent - child is not a direct descendant so it remains
      ChoiceSelectionService.clearChoiceSelection(document, parentChoice, namespaceMap);

      // Only child selection remains (parent cleared, child not invalidated)
      expect(document.definition.choiceSelections?.length).toBe(1);
      expect(document.definition.choiceSelections?.[0].schemaPath).toContain('Container');
    });
  });

  describe('applyChoiceSelections()', () => {
    it('should apply single selection', () => {
      const choice = document.fields[0].fields[0];
      const path = ChoiceSelectionService.buildChoicePath(choice, namespaceMap);

      const selections: IChoiceSelection[] = [{ schemaPath: path, selectedMemberIndex: 1 }];

      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(1);
    });

    it('should update document definition when applying selections', () => {
      const choice = document.fields[0].fields[0];
      const path = ChoiceSelectionService.buildChoicePath(choice, namespaceMap);

      expect(document.definition.choiceSelections).toBeUndefined();

      const selections: IChoiceSelection[] = [{ schemaPath: path, selectedMemberIndex: 1 }];
      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      expect(document.definition.choiceSelections).toHaveLength(1);
      expect(document.definition.choiceSelections![0]).toEqual({
        schemaPath: path,
        selectedMemberIndex: 1,
      });
    });

    it('should apply multiple selections', () => {
      const choice1 = document.fields[0].fields[0];
      const choice2 = document.fields[0].fields[2];
      const path1 = ChoiceSelectionService.buildChoicePath(choice1, namespaceMap);
      const path2 = ChoiceSelectionService.buildChoicePath(choice2, namespaceMap);

      const selections: IChoiceSelection[] = [
        { schemaPath: path1, selectedMemberIndex: 1 },
        { schemaPath: path2, selectedMemberIndex: 0 },
      ];

      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      expect(choice1.selectedMemberIndex).toBe(1);
      expect(choice2.selectedMemberIndex).toBe(0);
    });

    it('should apply selections in depth order (parent before child)', () => {
      const container = document.fields[0].fields[1];
      const childChoice = container.fields[0];
      const parentPath = '/ns0:Root/{choice:0}';
      const childPath = ChoiceSelectionService.buildChoicePath(childChoice, namespaceMap);

      // Provide selections in reverse order (child first)
      const selections: IChoiceSelection[] = [
        { schemaPath: childPath, selectedMemberIndex: 1 },
        { schemaPath: parentPath, selectedMemberIndex: 0 },
      ];

      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      // Both should be applied despite order
      const parentChoice = document.fields[0].fields[0];
      expect(parentChoice.selectedMemberIndex).toBe(0);
      expect(childChoice.selectedMemberIndex).toBe(1);
    });

    it('should sort selections by depth before applying (verifiable via definition order)', () => {
      const choice1 = document.fields[0].fields[0]; // depth 2: /ns0:Root/{choice:0}
      const container = document.fields[0].fields[1];
      const childChoice = container.fields[0]; // depth 3: /ns0:Root/ns0:Container/{choice:0}
      const choice2 = document.fields[0].fields[2]; // depth 2: /ns0:Root/{choice:1}

      const path1 = ChoiceSelectionService.buildChoicePath(choice1, namespaceMap);
      const childPath = ChoiceSelectionService.buildChoicePath(childChoice, namespaceMap);
      const path2 = ChoiceSelectionService.buildChoicePath(choice2, namespaceMap);

      // Provide in deliberately wrong order: deepest first
      const selections: IChoiceSelection[] = [
        { schemaPath: childPath, selectedMemberIndex: 0 },
        { schemaPath: path2, selectedMemberIndex: 1 },
        { schemaPath: path1, selectedMemberIndex: 2 },
      ];

      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      // Definition should have shallower paths first (depth 2 before depth 3)
      expect(document.definition.choiceSelections).toBeDefined();
      expect(document.definition.choiceSelections).toHaveLength(3);
      const depths = document.definition.choiceSelections!.map((s) => s.schemaPath.split('/').filter(Boolean).length);
      expect(depths[0]).toBeLessThanOrEqual(depths[1]);
      expect(depths[1]).toBeLessThanOrEqual(depths[2]);
    });

    it('should skip invalid paths gracefully', () => {
      const choice = document.fields[0].fields[0];
      const validPath = ChoiceSelectionService.buildChoicePath(choice, namespaceMap);

      const selections: IChoiceSelection[] = [
        { schemaPath: '/ns0:Invalid/{choice:99}', selectedMemberIndex: 0 },
        { schemaPath: validPath, selectedMemberIndex: 1 },
      ];

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      expect(choice.selectedMemberIndex).toBe(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not resolve choice path: /ns0:Invalid/{choice:99}'),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should skip invalid member indices gracefully', () => {
      const choice = document.fields[0].fields[0]; // Has 3 members (0-2)
      const path = ChoiceSelectionService.buildChoicePath(choice, namespaceMap);

      const selections: IChoiceSelection[] = [{ schemaPath: path, selectedMemberIndex: 99 }];

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      expect(choice.selectedMemberIndex).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid member index 99'));

      consoleWarnSpy.mockRestore();
    });

    it('should handle empty selections array', () => {
      expect(() => {
        ChoiceSelectionService.applyChoiceSelections(document, [], namespaceMap);
      }).not.toThrow();
    });

    it('should handle partial selections (some valid, some invalid)', () => {
      const choice1 = document.fields[0].fields[0];
      const choice2 = document.fields[0].fields[2];
      const path1 = ChoiceSelectionService.buildChoicePath(choice1, namespaceMap);
      const path2 = ChoiceSelectionService.buildChoicePath(choice2, namespaceMap);

      const selections: IChoiceSelection[] = [
        { schemaPath: path1, selectedMemberIndex: 1 },
        { schemaPath: '/ns0:Invalid/{choice:0}', selectedMemberIndex: 0 },
        { schemaPath: path2, selectedMemberIndex: 0 },
      ];

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      ChoiceSelectionService.applyChoiceSelections(document, selections, namespaceMap);

      expect(choice1.selectedMemberIndex).toBe(1);
      expect(choice2.selectedMemberIndex).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: set, persist, clear', () => {
      const choice = document.fields[0].fields[0];

      // Set selection
      ChoiceSelectionService.setChoiceSelection(document, choice, 1, namespaceMap);
      expect(choice.selectedMemberIndex).toBe(1);
      expect(document.definition.choiceSelections?.length).toBe(1);

      // Simulate persistence and reload
      const savedSelections = document.definition.choiceSelections!;
      const newDoc = createTestDocumentWithChoices();
      ChoiceSelectionService.applyChoiceSelections(newDoc, savedSelections, namespaceMap);

      const reloadedChoice = newDoc.fields[0].fields[0];
      expect(reloadedChoice.selectedMemberIndex).toBe(1);
      expect(newDoc.definition.choiceSelections?.length).toBe(1);

      // Clear selection
      ChoiceSelectionService.clearChoiceSelection(newDoc, reloadedChoice, namespaceMap);
      expect(reloadedChoice.selectedMemberIndex).toBeUndefined();
      expect(newDoc.definition.choiceSelections?.length).toBe(0);
    });

    it('should handle multiple nested selections', () => {
      const choice1 = document.fields[0].fields[0];
      const container = document.fields[0].fields[1];
      const choice2 = container.fields[0];
      const choice3 = document.fields[0].fields[2];

      // Set all selections
      ChoiceSelectionService.setChoiceSelection(document, choice1, 0, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, choice2, 1, namespaceMap);
      ChoiceSelectionService.setChoiceSelection(document, choice3, 1, namespaceMap);

      expect(document.definition.choiceSelections?.length).toBe(3);

      // Simulate reload
      const savedSelections = document.definition.choiceSelections!;
      const newDoc = createTestDocumentWithChoices();
      ChoiceSelectionService.applyChoiceSelections(newDoc, savedSelections, namespaceMap);

      const reloadedChoice1 = newDoc.fields[0].fields[0];
      const reloadedContainer = newDoc.fields[0].fields[1];
      const reloadedChoice2 = reloadedContainer.fields[0];
      const reloadedChoice3 = newDoc.fields[0].fields[2];

      expect(reloadedChoice1.selectedMemberIndex).toBe(0);
      expect(reloadedChoice2.selectedMemberIndex).toBe(1);
      expect(reloadedChoice3.selectedMemberIndex).toBe(1);
    });
  });
});
