import { DocumentDefinitionType, IField } from '../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
} from '../../models/datamapper/visualization';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { XmlSchemaDocument } from '../document/xml-schema/xml-schema-document.model';
import { VisualizationUtilService } from './visualization-util.service';

function createMockField(baseField: IField, overrides: Partial<IField> = {}): IField {
  return { ...baseField, ...overrides };
}

describe('VisualizationUtilService', () => {
  let sourceDoc: XmlSchemaDocument;
  let sourceDocNode: DocumentNodeData;
  let targetDoc: XmlSchemaDocument;
  let targetDocNode: TargetDocumentNodeData;

  beforeEach(() => {
    sourceDoc = TestUtil.createSourceOrderDoc();
    sourceDocNode = new DocumentNodeData(sourceDoc);
    targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
    targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
  });

  describe('isChoiceField', () => {
    it('should return true for ChoiceFieldNodeData', () => {
      const choiceField = {
        ...sourceDoc.fields[0],
        name: '__choice__',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [
          { ...sourceDoc.fields[0], name: 'email' },
          { ...sourceDoc.fields[0], name: 'phone' },
        ],
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationUtilService.isChoiceField(choiceNode)).toBe(true);
    });

    it('should return true for TargetChoiceFieldNodeData', () => {
      const choiceField = {
        ...sourceDoc.fields[0],
        name: '__choice__',
        displayName: 'choice',
        wrapperKind: 'choice' as const,
        fields: [
          { ...sourceDoc.fields[0], name: 'email' },
          { ...sourceDoc.fields[0], name: 'phone' },
        ],
      } as unknown as IField;
      const choiceNode = new TargetChoiceFieldNodeData(targetDocNode, choiceField);
      expect(VisualizationUtilService.isChoiceField(choiceNode)).toBe(true);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isChoiceField(fieldNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isChoiceField(sourceDocNode)).toBe(false);
    });
  });

  describe('isAbstractField', () => {
    it('should return true for AbstractFieldNodeData', () => {
      const abstractField = {
        ...sourceDoc.fields[0],
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        isAbstract: true,
        substitutionGroup: [
          { ...sourceDoc.fields[0], name: 'Cat' },
          { ...sourceDoc.fields[0], name: 'Dog' },
        ],
      } as unknown as IField;
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationUtilService.isAbstractField(abstractNode)).toBe(true);
    });

    it('should return true for TargetAbstractFieldNodeData', () => {
      const abstractField = {
        ...sourceDoc.fields[0],
        name: 'AbstractAnimal',
        displayName: 'AbstractAnimal',
        isAbstract: true,
        substitutionGroup: [
          { ...sourceDoc.fields[0], name: 'Cat' },
          { ...sourceDoc.fields[0], name: 'Dog' },
        ],
      } as unknown as IField;
      const abstractNode = new TargetAbstractFieldNodeData(targetDocNode, abstractField);
      expect(VisualizationUtilService.isAbstractField(abstractNode)).toBe(true);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isAbstractField(fieldNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isAbstractField(sourceDocNode)).toBe(false);
    });
  });

  describe('isCollectionField', () => {
    it('should return false for non-collection FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isCollectionField(fieldNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isCollectionField(sourceDocNode)).toBe(false);
    });

    it('should return true for selected abstract field when wrapper is collection', () => {
      const wrapperField = createMockField(sourceDoc.fields[0], {
        maxOccurs: 'unbounded',
      });
      const substituteField = createMockField(sourceDoc.fields[0], { name: 'Cat', maxOccurs: 1 });
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, substituteField);
      abstractNode.abstractField = wrapperField;
      expect(VisualizationUtilService.isCollectionField(abstractNode)).toBe(true);
    });

    it('should return false for selected abstract field when wrapper is not collection', () => {
      const wrapperField = createMockField(sourceDoc.fields[0], {
        maxOccurs: 1,
      });
      const substituteField = createMockField(sourceDoc.fields[0], { name: 'Cat', maxOccurs: 1 });
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, substituteField);
      abstractNode.abstractField = wrapperField;
      expect(VisualizationUtilService.isCollectionField(abstractNode)).toBe(false);
    });
  });

  describe('isAttributeField', () => {
    it('should return true for FieldNodeData with attribute field', () => {
      const attrField = { ...sourceDoc.fields[0], isAttribute: true } as unknown as IField;
      const fieldNode = new FieldNodeData(sourceDocNode, attrField);
      expect(VisualizationUtilService.isAttributeField(fieldNode)).toBe(true);
    });

    it('should return false for FieldNodeData with non-attribute field', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isAttributeField(fieldNode)).toBe(false);
    });

    it('should return true for FieldItemNodeData with attribute field', () => {
      const attrField = { ...sourceDoc.fields[0], isAttribute: true } as unknown as IField;
      const fieldItem = new FieldItem(targetDocNode.mappingTree, attrField);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isAttributeField(fieldItemNode)).toBe(true);
    });

    it('should return false for FieldItemNodeData with non-attribute field', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isAttributeField(fieldItemNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isAttributeField(sourceDocNode)).toBe(false);
    });
  });

  describe('isRecursiveField', () => {
    it('should return false for non-recursive FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isRecursiveField(fieldNode)).toBe(false);
    });

    it('should return false for non-recursive FieldItemNodeData', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isRecursiveField(fieldItemNode)).toBe(false);
    });

    it('should return false for DocumentNodeData', () => {
      expect(VisualizationUtilService.isRecursiveField(sourceDocNode)).toBe(false);
    });
  });

  describe('getField', () => {
    it('should return field for FieldNodeData', () => {
      const field = sourceDoc.fields[0];
      const fieldNode = new FieldNodeData(sourceDocNode, field);
      expect(VisualizationUtilService.getField(fieldNode)).toBe(field);
    });

    it('should return field for FieldItemNodeData', () => {
      const field = sourceDoc.fields[0];
      const fieldItem = new FieldItem(targetDocNode.mappingTree, field);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.getField(fieldItemNode)).toBe(field);
    });

    it('should return undefined for DocumentNodeData', () => {
      expect(VisualizationUtilService.getField(sourceDocNode)).toBeUndefined();
    });
  });

  describe('getSelectedChoiceDepth', () => {
    it('should return 0 for non-choice nodes', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.getSelectedChoiceDepth(fieldNode)).toBe(0);
    });

    it('should return 0 for unselected choice nodes', () => {
      const choiceField = {
        ...sourceDoc.fields[0],
        wrapperKind: 'choice' as const,
        fields: [],
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationUtilService.getSelectedChoiceDepth(choiceNode)).toBe(0);
    });

    it('should return 1 for simple selected choice', () => {
      const wrapper = {
        ...sourceDoc.fields[0],
        wrapperKind: 'choice' as const,
        selectedMemberIndex: 0,
        fields: [{ ...sourceDoc.fields[0], name: 'a', fields: [] }],
      } as unknown as IField;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      choiceNode.choiceField = wrapper;
      expect(VisualizationUtilService.getSelectedChoiceDepth(choiceNode)).toBe(1);
    });

    it('should return 3 for triple-nested selected choice', () => {
      const outermost = createMockField(sourceDoc.fields[0], { wrapperKind: 'choice' });
      const middle = createMockField(sourceDoc.fields[0], { wrapperKind: 'choice', parent: outermost });
      const inner = createMockField(sourceDoc.fields[0], {
        wrapperKind: 'choice',
        selectedMemberIndex: 0,
        parent: middle,
      });
      middle.fields = [inner];
      middle.selectedMemberIndex = 0;
      outermost.fields = [middle];
      outermost.selectedMemberIndex = 0;
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      choiceNode.choiceField = inner;
      expect(VisualizationUtilService.getSelectedChoiceDepth(choiceNode)).toBe(3);
    });
  });

  describe('isAbstractWrapperMember', () => {
    it('should return true for FieldItemNodeData under TargetAbstractFieldNodeData', () => {
      const abstractField = createMockField(sourceDoc.fields[0], {
        name: 'AbstractAnimal',
        wrapperKind: 'abstract',
      });
      const candidateField = createMockField(sourceDoc.fields[0], {
        name: 'Cat',
        parent: abstractField,
      });
      const abstractNode = new TargetAbstractFieldNodeData(targetDocNode, abstractField);
      const fieldItem = new FieldItem(targetDocNode.mappingTree, candidateField);
      const fieldItemNode = new FieldItemNodeData(abstractNode, fieldItem);
      expect(VisualizationUtilService.isAbstractWrapperMember(fieldItemNode)).toBe(true);
    });

    it('should return false for FieldItemNodeData under TargetDocumentNodeData', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isAbstractWrapperMember(fieldItemNode)).toBe(false);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isAbstractWrapperMember(fieldNode)).toBe(false);
    });

    it('should return false for AbstractFieldNodeData itself', () => {
      const abstractField = createMockField(sourceDoc.fields[0], {
        name: 'AbstractAnimal',
        wrapperKind: 'abstract',
      });
      const abstractNode = new AbstractFieldNodeData(sourceDocNode, abstractField);
      expect(VisualizationUtilService.isAbstractWrapperMember(abstractNode)).toBe(false);
    });
  });

  describe('isChoiceWrapperMember', () => {
    it('should return true for FieldItemNodeData under TargetChoiceFieldNodeData', () => {
      const choiceField = createMockField(sourceDoc.fields[0], {
        name: '__choice__',
        wrapperKind: 'choice',
      });
      const memberField = createMockField(sourceDoc.fields[0], {
        name: 'Email',
        parent: choiceField,
      });
      const choiceNode = new TargetChoiceFieldNodeData(targetDocNode, choiceField);
      const fieldItem = new FieldItem(targetDocNode.mappingTree, memberField);
      const fieldItemNode = new FieldItemNodeData(choiceNode, fieldItem);
      expect(VisualizationUtilService.isChoiceWrapperMember(fieldItemNode)).toBe(true);
    });

    it('should return false for FieldItemNodeData under TargetDocumentNodeData', () => {
      const fieldItem = new FieldItem(targetDocNode.mappingTree, sourceDoc.fields[0]);
      const fieldItemNode = new FieldItemNodeData(targetDocNode, fieldItem);
      expect(VisualizationUtilService.isChoiceWrapperMember(fieldItemNode)).toBe(false);
    });

    it('should return false for regular FieldNodeData', () => {
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isChoiceWrapperMember(fieldNode)).toBe(false);
    });

    it('should return false for ChoiceFieldNodeData itself', () => {
      const choiceField = createMockField(sourceDoc.fields[0], {
        name: '__choice__',
        wrapperKind: 'choice',
      });
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      expect(VisualizationUtilService.isChoiceWrapperMember(choiceNode)).toBe(false);
    });
  });

  describe('isTerminalField', () => {
    it('should return true for FieldNodeData with no children (terminal/primitive field)', () => {
      // Create a field with no children - a primitive/terminal field
      const terminalField = createMockField(sourceDoc.fields[0], { fields: [] });
      const fieldNode = new FieldNodeData(sourceDocNode, terminalField);
      expect(VisualizationUtilService.isTerminalField(fieldNode)).toBe(true);
    });

    it('should return false for FieldNodeData with children (non-terminal field)', () => {
      // Use the existing field which has children (complex type)
      const fieldNode = new FieldNodeData(sourceDocNode, sourceDoc.fields[0]);
      expect(VisualizationUtilService.isTerminalField(fieldNode)).toBe(false);
    });
  });
});
