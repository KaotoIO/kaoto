import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { FieldItem, MappingTree } from '../../models/datamapper/mapping';
import { Types } from '../../models/datamapper/types';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
  TargetAbstractFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { MappingValidationService } from './mapping-validation.service';

function createMockField(overrides: Partial<IField> = {}): IField {
  return {
    type: Types.String,
    selectedMemberIndex: undefined,
    fields: [],
    ...overrides,
  } as unknown as IField;
}

describe('MappingValidationService', () => {
  describe('validateFieldPair', () => {
    describe('container-to-terminal validation', () => {
      it('should reject source-container to target-terminal', () => {
        const source = createMockField({ type: Types.Container });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBeDefined();
      });

      it('should reject source-terminal to target-container', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ type: Types.Container });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBeDefined();
      });

      it('should allow source-container to target-container', () => {
        const source = createMockField({ type: Types.Container });
        const target = createMockField({ type: Types.Container });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-terminal to target-terminal', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });
    });

    describe('choice validation', () => {
      it('should reject any source to unselected choice target', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ wrapperKind: 'choice', selectedMemberIndex: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('unselected choice');
      });

      it('should reject source-choice to unselected choice target', () => {
        const source = createMockField({ wrapperKind: 'choice', selectedMemberIndex: undefined });
        const target = createMockField({ wrapperKind: 'choice', selectedMemberIndex: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
      });

      it('should reject source-choice-member to unselected choice target', () => {
        const source = createMockField({});
        const target = createMockField({ wrapperKind: 'choice', selectedMemberIndex: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
      });

      it('should allow source to target with selected choice member (selectedMemberIndex defined)', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ wrapperKind: 'choice', selectedMemberIndex: 0 });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-choice to target-non-choice field', () => {
        const source = createMockField({ wrapperKind: 'choice' });
        const target = createMockField({});
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-choice-member to target-regular', () => {
        const source = createMockField({});
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-regular to target-choice-member', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({});
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-regular to target-regular', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should skip container check for choice source with container type mapped to terminal target', () => {
        const source = createMockField({ wrapperKind: 'choice', type: Types.Container });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-choice to target-choice with selected member', () => {
        const source = createMockField({ wrapperKind: 'choice' });
        const target = createMockField({ wrapperKind: 'choice', selectedMemberIndex: 0 });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });
    });

    describe('abstract validation', () => {
      it('should reject any source to unselected abstract target', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ wrapperKind: 'abstract', selectedMemberIndex: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('unselected abstract element');
      });

      it('should allow source to target with selected abstract member', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ wrapperKind: 'abstract', selectedMemberIndex: 0 });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source to non-abstract target', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({});
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateMappingPair', () => {
    let sourceDoc: ReturnType<typeof TestUtil.createSourceOrderDoc>;
    let targetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
    let tree: MappingTree;
    let sourceDocNode: DocumentNodeData;
    let targetDocNode: TargetDocumentNodeData;

    beforeEach(() => {
      sourceDoc = TestUtil.createSourceOrderDoc();
      targetDoc = TestUtil.createTargetOrderDoc();
      tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      sourceDocNode = new DocumentNodeData(sourceDoc);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should reject same-side drops (both source) silently (no errorMessage)', () => {
      const sourceField = createMockField({ type: Types.String });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new FieldNodeData(sourceDocNode, sourceField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should reject same-side drops (both target) silently (no errorMessage)', () => {
      const targetField = createMockField({ type: Types.String });
      const fromNode = new TargetFieldNodeData(targetDocNode, targetField);
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should return sourceNode and targetNode on valid cross-side drop', () => {
      const sourceField = createMockField({ type: Types.String });
      const targetField = createMockField({ type: Types.String });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(true);
      expect(result.sourceNode).toBe(fromNode);
      expect(result.targetNode).toBe(toNode);
    });

    it('should reject cross-side drop to unselected choice target with errorMessage', () => {
      const sourceField = createMockField({ type: Types.String });
      const targetField = createMockField({ wrapperKind: 'choice', selectedMemberIndex: undefined });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.sourceNode).toBe(fromNode);
      expect(result.targetNode).toBe(toNode);
    });

    it('should return valid for cross-side drop when target is document node (not field-level)', () => {
      const sourceField = createMockField({ type: Types.String });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField) as NodeData;
      const result = MappingValidationService.validateMappingPair(fromNode, targetDocNode);
      expect(result.isValid).toBe(true);
      expect(result.sourceNode).toBe(fromNode);
      expect(result.targetNode).toBe(targetDocNode);
    });

    it('should run field validation when target is a FieldItemNodeData', () => {
      const sourceField = createMockField({ type: Types.Container });
      const targetField = createMockField({ type: Types.String });
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, targetField);
      const fieldItem = new FieldItem(tree, targetField);
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new FieldItemNodeData(targetFieldNode, fieldItem);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('container');
    });

    it('should reject unselected choice source dropped onto document root', () => {
      const choiceField = createMockField({ wrapperKind: 'choice', type: Types.Container });
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const result = MappingValidationService.validateMappingPair(choiceNode, targetDocNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('choice');
      expect(result.sourceNode).toBe(choiceNode);
      expect(result.targetNode).toBe(targetDocNode);
    });

    it('should allow unselected choice source dropped onto a target field', () => {
      const choiceField = createMockField({ wrapperKind: 'choice', type: Types.Container });
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetField = createMockField({ type: Types.String });
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(choiceNode, toNode);
      expect(result.isValid).toBe(true);
    });

    it('should reject cross-side drop to unselected abstract target with errorMessage', () => {
      const sourceField = createMockField({ type: Types.String });
      const targetField = createMockField({ wrapperKind: 'abstract', selectedMemberIndex: undefined });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.sourceNode).toBe(fromNode);
      expect(result.targetNode).toBe(toNode);
    });

    it('should return valid when source is a PrimitiveDocument node and target is a field', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const primDocNode = new DocumentNodeData(primitiveDoc);
      const targetField = createMockField({ type: Types.String });
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(primDocNode, toNode);
      expect(result.isValid).toBe(true);
      expect(result.sourceNode).toBe(primDocNode);
      expect(result.targetNode).toBe(toNode);
    });
  });

  describe('isDraggable', () => {
    let sourceDoc: ReturnType<typeof TestUtil.createSourceOrderDoc>;
    let targetDoc: ReturnType<typeof TestUtil.createTargetOrderDoc>;
    let tree: MappingTree;
    let sourceDocNode: DocumentNodeData;
    let targetDocNode: TargetDocumentNodeData;

    beforeEach(() => {
      sourceDoc = TestUtil.createSourceOrderDoc();
      targetDoc = TestUtil.createTargetOrderDoc();
      tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      sourceDocNode = new DocumentNodeData(sourceDoc);
      targetDocNode = new TargetDocumentNodeData(targetDoc, tree);
    });

    it('should return true for regular FieldNodeData', () => {
      const field = createMockField({ type: Types.String });
      const node = new FieldNodeData(sourceDocNode, field);
      expect(MappingValidationService.isDraggable(node)).toBe(true);
    });

    it('should return false for UnknownMappingNodeData', () => {
      const node = { ...new FieldNodeData(sourceDocNode, createMockField()) } as unknown as UnknownMappingNodeData;
      Object.setPrototypeOf(node, UnknownMappingNodeData.prototype);
      expect(MappingValidationService.isDraggable(node)).toBe(false);
    });

    it('should return false for AddMappingNodeData', () => {
      const field = createMockField({ type: Types.String });
      const node = new AddMappingNodeData(targetDocNode, field);
      expect(MappingValidationService.isDraggable(node)).toBe(false);
    });

    it('should return false for unselected AbstractFieldNodeData', () => {
      const field = createMockField({ wrapperKind: 'abstract' });
      const node = new AbstractFieldNodeData(sourceDocNode, field);
      expect(MappingValidationService.isDraggable(node)).toBe(false);
    });

    it('should return true for selected AbstractFieldNodeData', () => {
      const field = createMockField({ wrapperKind: 'abstract' });
      const node = new AbstractFieldNodeData(sourceDocNode, field);
      node.abstractField = field;
      expect(MappingValidationService.isDraggable(node)).toBe(true);
    });

    it('should return false for unselected TargetAbstractFieldNodeData', () => {
      const field = createMockField({ wrapperKind: 'abstract' });
      const node = new TargetAbstractFieldNodeData(targetDocNode, field);
      expect(MappingValidationService.isDraggable(node)).toBe(false);
    });

    it('should return true for selected TargetAbstractFieldNodeData', () => {
      const field = createMockField({ wrapperKind: 'abstract' });
      const node = new TargetAbstractFieldNodeData(targetDocNode, field);
      node.abstractField = field;
      expect(MappingValidationService.isDraggable(node)).toBe(true);
    });

    it('should return true for primitive DocumentNodeData', () => {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const node = new DocumentNodeData(primitiveDoc);
      expect(MappingValidationService.isDraggable(node)).toBe(true);
    });

    it('should return false for non-primitive DocumentNodeData', () => {
      expect(MappingValidationService.isDraggable(sourceDocNode)).toBe(false);
    });

    it('should return true for VariableNodeData', () => {
      const node = { title: 'var' } as unknown as VariableNodeData;
      Object.setPrototypeOf(node, VariableNodeData.prototype);
      expect(MappingValidationService.isDraggable(node)).toBe(true);
    });
  });

  describe('isDroppable', () => {
    const sourceNode = { isSource: true } as unknown as NodeData;
    const targetNode = { isSource: false } as unknown as NodeData;

    it('should return true when no active node', () => {
      expect(MappingValidationService.isDroppable(undefined, targetNode)).toBe(true);
    });

    it('should return true for cross-side drop (source to target)', () => {
      expect(MappingValidationService.isDroppable(sourceNode, targetNode)).toBe(true);
    });

    it('should return false for same-side drop (source to source)', () => {
      const anotherSource = { isSource: true } as unknown as NodeData;
      expect(MappingValidationService.isDroppable(sourceNode, anotherSource)).toBe(false);
    });

    it('should return false for same-side drop (target to target)', () => {
      const anotherTarget = { isSource: false } as unknown as NodeData;
      expect(MappingValidationService.isDroppable(targetNode, anotherTarget)).toBe(false);
    });

    it('should return false when target is UnknownMappingNodeData', () => {
      const unknownNode = {} as unknown as UnknownMappingNodeData;
      Object.setPrototypeOf(unknownNode, UnknownMappingNodeData.prototype);
      expect(MappingValidationService.isDroppable(sourceNode, unknownNode)).toBe(false);
    });

    it('should return false when target is AddMappingNodeData', () => {
      const addNode = {} as unknown as AddMappingNodeData;
      Object.setPrototypeOf(addNode, AddMappingNodeData.prototype);
      expect(MappingValidationService.isDroppable(sourceNode, addNode)).toBe(false);
    });
  });
});
