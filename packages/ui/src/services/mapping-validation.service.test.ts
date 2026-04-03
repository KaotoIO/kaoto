import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
  PrimitiveDocument,
} from '../models/datamapper/document';
import { FieldItem, MappingTree } from '../models/datamapper/mapping';
import { Types } from '../models/datamapper/types';
import {
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
} from '../models/datamapper/visualization';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { MappingValidationService } from './mapping-validation.service';

function createMockField(overrides: Partial<IField> = {}): IField {
  return {
    type: Types.String,
    isChoice: false,
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
        const target = createMockField({ isChoice: true, selectedMemberIndex: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('unselected choice');
      });

      it('should reject source-choice to unselected choice target', () => {
        const source = createMockField({ isChoice: true, selectedMemberIndex: undefined });
        const target = createMockField({ isChoice: true, selectedMemberIndex: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
      });

      it('should reject source-choice-member to unselected choice target', () => {
        const source = createMockField({ isChoice: false });
        const target = createMockField({ isChoice: true, selectedMemberIndex: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
      });

      it('should allow source to target with selected choice member (selectedMemberIndex defined)', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ isChoice: true, selectedMemberIndex: 0 });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-choice to target-non-choice field', () => {
        const source = createMockField({ isChoice: true });
        const target = createMockField({ isChoice: false });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-choice-member to target-regular', () => {
        const source = createMockField({ isChoice: false });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-regular to target-choice-member', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ isChoice: false });
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
        const source = createMockField({ isChoice: true, type: Types.Container });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow source-choice to target-choice with selected member', () => {
        const source = createMockField({ isChoice: true });
        const target = createMockField({ isChoice: true, selectedMemberIndex: 0 });
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
      const targetField = createMockField({ isChoice: true, selectedMemberIndex: undefined });
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
});
