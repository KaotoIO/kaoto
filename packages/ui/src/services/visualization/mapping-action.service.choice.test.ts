import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
} from '../../models/datamapper/document';
import {
  ChooseItem,
  FieldItem,
  ForEachItem,
  MappingTree,
  OtherwiseItem,
  ValueSelector,
} from '../../models/datamapper/mapping';
import {
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../models/datamapper/visualization';
import { getTestDocumentXsd, TestUtil } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../document/xml-schema/xml-schema-document.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationService } from './visualization.service';

describe('MappingActionService / choice field mappings', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let targetDoc: XmlSchemaDocument;
  let tree: MappingTree;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    targetDoc = TestUtil.createTargetOrderDoc();
    tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
  });

  function createMockChoiceField(members: { name: string }[], selectedMemberIndex?: number) {
    const baseField = sourceDoc.fields[0];
    const memberFields = members.map((m) => ({
      ...baseField,
      name: m.name,
      displayName: m.name,
      fields: [],
      isChoice: false,
    }));
    return {
      ...baseField,
      name: '__choice__',
      displayName: 'choice',
      isChoice: true,
      selectedMemberIndex,
      fields: memberFields,
    } as unknown as typeof baseField;
  }

  function createMockCollectionChoiceField(members: { name: string }[], selectedMemberIndex?: number) {
    const baseField = sourceDoc.fields[0];
    const memberFields = members.map((m) => ({
      ...baseField,
      name: m.name,
      displayName: m.name,
      fields: [],
      isChoice: false,
      maxOccurs: 1,
    }));
    return {
      ...baseField,
      name: '__choice__',
      displayName: 'choice',
      isChoice: true,
      wrapperKind: 'choice' as const,
      selectedMemberIndex,
      fields: memberFields,
      maxOccurs: 'unbounded' as const,
    } as unknown as typeof baseField;
  }

  function createMockCollectionField() {
    const baseField = targetDoc.fields[0];
    return {
      ...baseField,
      name: 'collectionField',
      displayName: 'collectionField',
      maxOccurs: 'unbounded' as const,
    } as unknown as typeof baseField;
  }

  describe('engageMapping with choice source', () => {
    let localTargetDocNode: TargetDocumentNodeData;

    beforeEach(() => {
      localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should create ChooseItem with WhenItems and OtherwiseItem for choice source with 2 members', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      expect(tree.children.length).toEqual(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);

      const chooseItem = targetFieldItem.children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('each WhenItem expression should be the XPath of the corresponding choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      expect(chooseItem.when[0].expression).toEqual('/ns0:email');
      expect(chooseItem.when[1].expression).toEqual('/ns0:phone');
    });

    it('each WhenItem ValueSelector expression should be the XPath of the corresponding choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      const emailSelector = chooseItem.when[0].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      const phoneSelector = chooseItem.when[1].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(emailSelector.expression).toEqual('/ns0:email');
      expect(phoneSelector.expression).toEqual('/ns0:phone');
    });

    it('should create ChooseItem when dropping choice source onto an existing FieldItemNodeData target', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);

      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(localTargetDocNode);
      MappingActionService.engageMapping(
        tree,
        sourceDocChildren[0] as FieldNodeData,
        targetDocChildren[0] as TargetNodeData,
      );

      const updatedTargetDocChildren = VisualizationService.generateStructuredDocumentChildren(localTargetDocNode);
      const fieldItemNode = updatedTargetDocChildren[0] as FieldItemNodeData;
      expect(fieldItemNode).toBeInstanceOf(FieldItemNodeData);

      const valueSelectorBefore = fieldItemNode.mapping.children.some((c) => c instanceof ValueSelector);
      expect(valueSelectorBefore).toBe(true);

      MappingActionService.engageMapping(tree, choiceNode, fieldItemNode);

      const chooseItem = fieldItemNode.mapping.children.find((c) => c instanceof ChooseItem) as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
      const valueSelectorAfter = fieldItemNode.mapping.children.some((c) => c instanceof ValueSelector);
      expect(valueSelectorAfter).toBe(false);
    });

    it('should create ChooseItem with only OtherwiseItem for empty-member choice source', () => {
      const choiceField = createMockChoiceField([]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const chooseItem = tree.children[0].children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(0);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('should create a simple field mapping when dragging a selected choice member', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }], 0);
      const selectedMember = choiceField.fields[0];
      const choiceNode = new ChoiceFieldNodeData(
        sourceDocNode,
        selectedMember as unknown as (typeof sourceDoc.fields)[0],
      );
      choiceNode.choiceField = choiceField;
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      expect(tree.children.length).toEqual(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);
      expect(targetFieldItem.children[0]).toBeInstanceOf(ValueSelector);
      expect(targetFieldItem.children[0]).not.toBeInstanceOf(ChooseItem);
    });

    it('should not create duplicate ChooseItem when mapping the same choice source twice', () => {
      const choiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, targetDoc.fields[0]);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);
      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const targetFieldItem = tree.children[0];
      const chooseItems = targetFieldItem.children.filter((c) => c instanceof ChooseItem);
      expect(chooseItems.length).toEqual(1);
    });
  });

  describe('mapping through unselected target choice wrapper', () => {
    let localTargetDocNode: TargetDocumentNodeData;
    let parentFieldNode: TargetFieldNodeData;
    let choiceField: ReturnType<typeof createMockChoiceField>;

    beforeEach(() => {
      localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      choiceField = createMockChoiceField([{ name: 'contactEmail' }, { name: 'contactPhone' }]);
      const parentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      parentFieldNode = new TargetFieldNodeData(localTargetDocNode, parentField as (typeof targetDoc.fields)[0]);
    });

    it('getOrCreateFieldItem should skip unselected choice wrapper and create FieldItem under grandparent', () => {
      const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
      expect(choiceNode.choiceField).toBeUndefined();

      const memberField = choiceField.fields[0];
      const memberNode = new TargetFieldNodeData(choiceNode, memberField);

      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

      const parentItem = tree.children[0];
      expect(parentItem).toBeInstanceOf(FieldItem);
      const memberItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === memberField,
      ) as FieldItem;
      expect(memberItem).toBeDefined();
      expect(memberItem.field.name).toEqual('contactEmail');
    });

    it('generateNonDocumentNodeDataChildren should find mappings for fields inside unselected choice wrapper', () => {
      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
      const memberField = choiceField.fields[0];
      const memberNode = new TargetFieldNodeData(choiceNode, memberField);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const freshParentField = {
        ...targetDoc.fields[0],
        fields: [choiceField],
      };
      const freshParentNode = new TargetFieldNodeData(
        freshTargetDocNode,
        freshParentField as (typeof targetDoc.fields)[0],
      );
      freshParentNode.mapping = tree.children[0] as FieldItem;

      const freshChoiceNode = new TargetChoiceFieldNodeData(freshParentNode, choiceField);
      const choiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode);

      const contactEmailNode = choiceChildren.find((c) => c.title === 'contactEmail');
      expect(contactEmailNode).toBeDefined();
      expect(contactEmailNode).toBeInstanceOf(FieldItemNodeData);
    });

    it('FieldItemNodeData.path should include choice wrapper segment while FieldItem.nodePath should not', () => {
      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      const choiceNode = new TargetChoiceFieldNodeData(parentFieldNode, choiceField);
      const memberField = choiceField.fields[0];
      const memberNode = new TargetFieldNodeData(choiceNode, memberField);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, memberNode);

      const freshTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
      const parentItem = tree.children[0] as FieldItem;
      const freshParentNode = new FieldItemNodeData(freshTargetDocNode, parentItem);
      freshParentNode.field = {
        ...freshParentNode.field,
        fields: [choiceField],
      } as typeof freshParentNode.field;

      const freshChoiceNode = new TargetChoiceFieldNodeData(freshParentNode, choiceField);
      const choiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode);
      const contactEmailNode = choiceChildren.find((c) => c.title === 'contactEmail') as FieldItemNodeData;

      const mappingFieldItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === memberField,
      ) as FieldItem;
      expect(contactEmailNode.path.pathSegments).toContain(choiceField.id);
      expect(mappingFieldItem.nodePath.pathSegments).not.toContain(choiceField.id);
    });

    it('should work for nested fields inside choice member (mapping + rendering + path)', () => {
      const baseField = sourceDoc.fields[0];
      const nestedField = {
        ...baseField,
        name: 'emailAddress',
        displayName: 'emailAddress',
        fields: [] as unknown[],
        isChoice: false,
      } as unknown as typeof baseField;
      const memberWithChildren = {
        ...baseField,
        name: 'contactEmail',
        displayName: 'contactEmail',
        fields: [nestedField],
        isChoice: false,
      } as unknown as typeof baseField;
      (nestedField as unknown as Record<string, unknown>).parent = memberWithChildren;
      const nestedChoiceField = {
        ...baseField,
        name: 'choice',
        displayName: 'choice',
        isChoice: true,
        selectedMemberIndex: undefined,
        fields: [memberWithChildren],
      } as unknown as typeof baseField;

      const nestedParentField = {
        ...targetDoc.fields[0],
        fields: [nestedChoiceField],
      };
      const nestedParentNode = new TargetFieldNodeData(
        localTargetDocNode,
        nestedParentField as (typeof targetDoc.fields)[0],
      );

      const nestedChoiceNode = new TargetChoiceFieldNodeData(nestedParentNode, nestedChoiceField);
      const contactEmailNode = new TargetFieldNodeData(nestedChoiceNode, memberWithChildren);
      const emailAddressNode = new TargetFieldNodeData(contactEmailNode, nestedField);

      const sourceDocChildren = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode = sourceDocChildren[0] as FieldNodeData;
      const sourceChildren = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode);

      MappingActionService.engageMapping(tree, sourceChildren[0] as FieldNodeData, emailAddressNode);

      const parentItem = tree.children[0] as FieldItem;
      expect(parentItem).toBeInstanceOf(FieldItem);
      const contactEmailItem = parentItem.children.find(
        (c) => c instanceof FieldItem && c.field === memberWithChildren,
      ) as FieldItem;
      expect(contactEmailItem).toBeDefined();
      const emailAddressItem = contactEmailItem.children.find(
        (c) => c instanceof FieldItem && c.field === nestedField,
      ) as FieldItem;
      expect(emailAddressItem).toBeDefined();

      const valueSelector = emailAddressItem.children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(valueSelector).toBeDefined();
      expect(valueSelector.expression).not.toEqual('');

      const freshTargetDocNode2 = new TargetDocumentNodeData(targetDoc, tree);
      const freshParentNode2 = new FieldItemNodeData(freshTargetDocNode2, parentItem);
      freshParentNode2.field = {
        ...freshParentNode2.field,
        fields: [nestedChoiceField],
      } as typeof freshParentNode2.field;

      const freshChoiceNode2 = new TargetChoiceFieldNodeData(freshParentNode2, nestedChoiceField);
      const freshChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshChoiceNode2);

      const freshContactEmailNode = freshChoiceChildren.find((c) => c.title === 'contactEmail') as FieldItemNodeData;
      expect(freshContactEmailNode).toBeInstanceOf(FieldItemNodeData);

      const contactEmailChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshContactEmailNode);
      const freshEmailAddressNode = contactEmailChildren.find((c) => c.title === 'emailAddress');
      expect(freshEmailAddressNode).toBeDefined();
      expect(freshEmailAddressNode).toBeInstanceOf(FieldItemNodeData);

      expect((freshEmailAddressNode as FieldItemNodeData).path.pathSegments).toContain(nestedChoiceField.id);
      expect(emailAddressItem.nodePath.pathSegments).not.toContain(nestedChoiceField.id);
    });
  });

  describe('nested choice wrappers (choice inside choice)', () => {
    it('should map to a field inside a nested choice and render the mapping correctly', () => {
      const definition = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'testDocument.xsd': getTestDocumentXsd() },
      );
      const testTargetDoc = XmlSchemaDocumentService.createXmlSchemaDocument(definition).document!;
      const testTree = new MappingTree(
        testTargetDoc.documentType,
        testTargetDoc.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const testTargetDocNode = new TargetDocumentNodeData(testTargetDoc, testTree);

      const docChildren = VisualizationService.generateStructuredDocumentChildren(testTargetDocNode);
      const testDocumentNode = docChildren[0];
      const testDocumentChildren = VisualizationService.generateNonDocumentNodeDataChildren(testDocumentNode);
      const directNestedNode = testDocumentChildren.find((c) => c.title === 'DirectNestedChoiceElement')!;
      const directNestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(directNestedNode);

      expect(directNestedChildren.length).toEqual(1);
      const outerChoice = directNestedChildren[0] as TargetChoiceFieldNodeData;
      expect(outerChoice).toBeInstanceOf(TargetChoiceFieldNodeData);

      const outerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(outerChoice);
      expect(outerChoiceChildren[0].title).toEqual('Direct1');
      const innerChoice = outerChoiceChildren.find(
        (c) => c instanceof TargetChoiceFieldNodeData,
      ) as TargetChoiceFieldNodeData;
      expect(innerChoice).toBeDefined();

      const innerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(innerChoice);
      const nestedDirect1 = innerChoiceChildren.find((c) => c.title === 'NestedDirect1')! as TargetFieldNodeData;
      expect(nestedDirect1).toBeDefined();

      const sourceDocChildren2 = VisualizationService.generateStructuredDocumentChildren(sourceDocNode);
      const sourceFieldNode2 = sourceDocChildren2[0] as FieldNodeData;
      const sourceChildren2 = VisualizationService.generateNonDocumentNodeDataChildren(sourceFieldNode2);
      MappingActionService.engageMapping(testTree, sourceChildren2[0] as FieldNodeData, nestedDirect1);

      const testDocItem = testTree.children[0] as FieldItem;
      expect(testDocItem).toBeInstanceOf(FieldItem);
      const directNestedItem = testDocItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'DirectNestedChoiceElement',
      ) as FieldItem;
      expect(directNestedItem).toBeDefined();
      const nestedDirect1Item = directNestedItem.children.find(
        (c) => c instanceof FieldItem && c.field.name === 'NestedDirect1',
      ) as FieldItem;
      expect(nestedDirect1Item).toBeDefined();

      const freshDocNode = new TargetDocumentNodeData(testTargetDoc, testTree);
      const freshDocChildren = VisualizationService.generateStructuredDocumentChildren(freshDocNode);
      const freshTestDocNode = freshDocChildren[0];
      const freshTestDocChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshTestDocNode);
      const freshDirectNestedNode = freshTestDocChildren.find(
        (c) => c.title === 'DirectNestedChoiceElement',
      )! as FieldItemNodeData;
      expect(freshDirectNestedNode).toBeInstanceOf(FieldItemNodeData);

      const freshDirectNestedChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshDirectNestedNode);
      const freshOuterChoice = freshDirectNestedChildren[0] as TargetChoiceFieldNodeData;
      expect(freshOuterChoice).toBeInstanceOf(TargetChoiceFieldNodeData);

      const freshOuterChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshOuterChoice);
      const freshInnerChoice = freshOuterChoiceChildren.find(
        (c) => c instanceof TargetChoiceFieldNodeData,
      ) as TargetChoiceFieldNodeData;
      expect(freshInnerChoice).toBeDefined();

      const freshInnerChoiceChildren = VisualizationService.generateNonDocumentNodeDataChildren(freshInnerChoice);
      const freshNestedDirect1 = freshInnerChoiceChildren.find((c) => c.title === 'NestedDirect1');
      expect(freshNestedDirect1).toBeDefined();
      expect(freshNestedDirect1).toBeInstanceOf(FieldItemNodeData);

      expect((freshNestedDirect1 as FieldItemNodeData).path.pathSegments).toContain(freshOuterChoice.id);
      expect((freshNestedDirect1 as FieldItemNodeData).path.pathSegments).toContain(freshInnerChoice.id);
      expect(nestedDirect1Item.nodePath.pathSegments).not.toContain(freshOuterChoice.id);
      expect(nestedDirect1Item.nodePath.pathSegments).not.toContain(freshInnerChoice.id);
    });
  });

  describe('collection choice wrapper mappings (S2 scenario)', () => {
    let localTargetDocNode: TargetDocumentNodeData;

    beforeEach(() => {
      localTargetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should create ForEachItem wrapping ChooseItem when mapping collection choice wrapper to collection field', () => {
      const collectionChoiceField = createMockCollectionChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, collectionChoiceField);
      const collectionTargetField = createMockCollectionField();
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, collectionTargetField);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      expect(tree.children.length).toEqual(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);

      const forEachItem = targetFieldItem.children[0];
      expect(forEachItem).toBeInstanceOf(ForEachItem);
      expect(forEachItem.children.length).toEqual(1);

      const chooseItem = forEachItem.children[0] as ChooseItem;
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem.when.length).toEqual(2);
      expect(chooseItem.otherwise).toBeInstanceOf(OtherwiseItem);
    });

    it('ForEachItem expression should be the XPath of the collection choice wrapper', () => {
      const collectionChoiceField = createMockCollectionChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, collectionChoiceField);
      const collectionTargetField = createMockCollectionField();
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, collectionTargetField);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const forEachItem = tree.children[0].children[0] as ForEachItem;
      expect(forEachItem.expression).toBeTruthy();
    });

    it('WhenItem expressions inside ForEachItem should reference the choice members', () => {
      const collectionChoiceField = createMockCollectionChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, collectionChoiceField);
      const collectionTargetField = createMockCollectionField();
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, collectionTargetField);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const forEachItem = tree.children[0].children[0] as ForEachItem;
      const chooseItem = forEachItem.children[0] as ChooseItem;
      expect(chooseItem.when[0].expression).toEqual('/ns0:email');
      expect(chooseItem.when[1].expression).toEqual('/ns0:phone');
      const emailSelector = chooseItem.when[0].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      const phoneSelector = chooseItem.when[1].children.find((c) => c instanceof ValueSelector) as ValueSelector;
      expect(emailSelector.expression).toEqual('/ns0:email');
      expect(phoneSelector.expression).toEqual('/ns0:phone');
    });

    it('should create only ChooseItem (no ForEachItem) when mapping collection choice wrapper to non-collection field (S1)', () => {
      const collectionChoiceField = createMockCollectionChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, collectionChoiceField);
      const nonCollectionTargetField = targetDoc.fields[0]; // maxOccurs = 1
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, nonCollectionTargetField);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      expect(tree.children.length).toEqual(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);

      const chooseItem = targetFieldItem.children[0];
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem).not.toBeInstanceOf(ForEachItem);
      expect((chooseItem as ChooseItem).when.length).toEqual(2);
    });

    it('should create only ChooseItem when mapping non-collection choice wrapper to collection field', () => {
      const nonCollectionChoiceField = createMockChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, nonCollectionChoiceField);
      const collectionTargetField = createMockCollectionField();
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, collectionTargetField);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      expect(tree.children.length).toEqual(1);
      const targetFieldItem = tree.children[0];
      expect(targetFieldItem).toBeInstanceOf(FieldItem);
      expect(targetFieldItem.children.length).toEqual(1);

      const chooseItem = targetFieldItem.children[0];
      expect(chooseItem).toBeInstanceOf(ChooseItem);
      expect(chooseItem).not.toBeInstanceOf(ForEachItem);
    });

    it('should not create duplicate ForEachItem when mapping the same collection choice source twice', () => {
      const collectionChoiceField = createMockCollectionChoiceField([{ name: 'email' }, { name: 'phone' }]);
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, collectionChoiceField);
      const collectionTargetField = createMockCollectionField();
      const targetFieldNode = new TargetFieldNodeData(localTargetDocNode, collectionTargetField);

      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);
      MappingActionService.engageMapping(tree, choiceNode, targetFieldNode);

      const targetFieldItem = tree.children[0];
      const forEachItems = targetFieldItem.children.filter((c) => c instanceof ForEachItem);
      expect(forEachItems.length).toEqual(1);
    });
  });
});
