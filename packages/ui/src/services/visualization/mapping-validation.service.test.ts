import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { FieldItem, MappingTree, VariableItem } from '../../models/datamapper/mapping';
import { Types } from '../../models/datamapper/types';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  FieldNodeData,
  NodeData,
  SequenceFieldNodeData,
  SourceVariableNodeData,
  TargetAbstractFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  TargetSequenceFieldNodeData,
  UnknownMappingNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { QName } from '../../xml-schema-ts/QName';
import { JsonSchemaDocument, JsonSchemaField } from '../document/json-schema/json-schema-document.model';
import { XmlSchemaDocument, XmlSchemaField } from '../document/xml-schema/xml-schema-document.model';
import { MappingValidationService } from './mapping-validation.service';

function createMockField(overrides: Partial<IField> = {}): IField {
  return {
    type: Types.String,
    selectedMemberIndex: undefined,
    fields: [],
    namedTypeFragmentRefs: [],
    isAttribute: false,
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

      it('should allow xs:anyType source to container target', () => {
        const source = createMockField({ type: Types.AnyType });
        const target = createMockField({ type: Types.Container });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow container source to xs:anyType target', () => {
        const source = createMockField({ type: Types.Container });
        const target = createMockField({ type: Types.AnyType });
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
        expect(result.errorMessage).toContain('Select a choice member before mapping');
      });

      it('should reject source-choice to unselected choice target', () => {
        const source = createMockField({ wrapperKind: 'choice', selectedMemberIndex: undefined });
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
        const target = createMockField({ wrapperKind: 'abstract', selectedMemberQName: undefined });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('Configure the abstract field before mapping');
      });

      it('should allow source to target with selected abstract member', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ wrapperKind: 'abstract', selectedMemberQName: new QName(null, 'MockMember') });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });
    });

    describe('sequence validation', () => {
      it('should reject any source to sequence wrapper target', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ wrapperKind: 'sequence' });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('sequence group');
      });
    });

    describe('array wrapper rejection', () => {
      it('should reject source with Types.Array', () => {
        const source = createMockField({ type: Types.Array });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('array wrapper');
      });

      it('should reject target with Types.Array', () => {
        const source = createMockField({ type: Types.String });
        const target = createMockField({ type: Types.Array });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('array wrapper');
      });

      it('should skip array check for source with wrapperKind', () => {
        const source = createMockField({ type: Types.Array, wrapperKind: 'choice' });
        const target = createMockField({ type: Types.String });
        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });
    });

    describe('container-to-container matching children validation', () => {
      it('should reject XML containers with no matching children', () => {
        const source = createXmlSchemaField('source', 'http://example.com/ns');
        source.type = Types.Container;
        source.fields.push(createXmlSchemaField('name', 'http://example.com/ns'));

        const target = createXmlSchemaField('target', 'http://example.com/ns');
        target.type = Types.Container;
        target.fields.push(createXmlSchemaField('email', 'http://example.com/ns'));

        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('no matching children');
      });

      it('should accept XML containers with matching children', () => {
        const source = createXmlSchemaField('source', 'http://example.com/ns');
        source.type = Types.Container;
        source.fields.push(createXmlSchemaField('name', 'http://example.com/ns'));

        const target = createXmlSchemaField('target', 'http://example.com/ns');
        target.type = Types.Container;
        target.fields.push(createXmlSchemaField('name', 'http://example.com/ns'));

        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should reject JSON containers with no matching children', () => {
        const source = createJsonSchemaField('source', Types.Container);
        source.fields.push(createJsonSchemaField('name', Types.String));

        const target = createJsonSchemaField('target', Types.Container);
        target.fields.push(createJsonSchemaField('email', Types.String));

        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('no matching children');
      });

      it('should accept JSON containers with matching children', () => {
        const source = createJsonSchemaField('source', Types.Container);
        source.fields.push(createJsonSchemaField('name', Types.String));

        const target = createJsonSchemaField('target', Types.Container);
        target.fields.push(createJsonSchemaField('name', Types.String));

        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should reject cross-format containers with no matching children', () => {
        const source = createXmlSchemaField('source', 'http://example.com/ns');
        source.type = Types.Container;
        source.fields.push(createXmlSchemaField('name', 'http://example.com/ns'));

        const target = createJsonSchemaField('target', Types.Container);
        target.fields.push(createJsonSchemaField('email', Types.String));

        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('no matching children');
      });

      it('should accept cross-format containers with matching children', () => {
        const source = createXmlSchemaField('source', 'http://example.com/ns');
        source.type = Types.Container;
        source.fields.push(createXmlSchemaField('name', 'http://example.com/ns'));

        const target = createJsonSchemaField('target', Types.Container);
        target.fields.push(createJsonSchemaField('name', Types.String));

        const result = MappingValidationService.validateFieldPair(source, target);
        expect(result.isValid).toBe(true);
      });

      it('should allow containers when one has namedTypeFragmentRefs but no direct children', () => {
        const source = createMockField({
          type: Types.Container,
          fields: [],
          namedTypeFragmentRefs: ['SomeType'],
        });
        const target = createMockField({ type: Types.Container, fields: [] });
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

    it('should reject drop onto FieldItemNodeData with unconfigured choice field', () => {
      const sourceField = createMockField({ type: Types.String });
      const choiceField = createMockField({ wrapperKind: 'choice', selectedMemberIndex: undefined });
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, choiceField);
      const fieldItem = new FieldItem(tree, choiceField);
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new FieldItemNodeData(targetFieldNode, fieldItem);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Select a choice member before mapping');
    });

    it('should accept drop onto FieldItemNodeData with selected choice field', () => {
      const sourceField = createMockField({ type: Types.String });
      const choiceField = createMockField({ wrapperKind: 'choice', selectedMemberIndex: 0 });
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, choiceField);
      const fieldItem = new FieldItem(tree, choiceField);
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new FieldItemNodeData(targetFieldNode, fieldItem);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(true);
    });

    it('should reject drop onto FieldItemNodeData with unconfigured abstract field', () => {
      const sourceField = createMockField({ type: Types.String });
      const abstractField = createMockField({ wrapperKind: 'abstract', selectedMemberQName: undefined });
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, abstractField);
      const fieldItem = new FieldItem(tree, abstractField);
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new FieldItemNodeData(targetFieldNode, fieldItem);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Configure the abstract field before mapping');
    });

    it('should accept drop onto FieldItemNodeData with substituted abstract field', () => {
      const sourceField = createMockField({ type: Types.String });
      const abstractField = createMockField({
        wrapperKind: 'abstract',
        selectedMemberQName: new QName(null, 'ConcreteType'),
      });
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, abstractField);
      const fieldItem = new FieldItem(tree, abstractField);
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new FieldItemNodeData(targetFieldNode, fieldItem);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(true);
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

    it('should reject unselected choice source with container members dropped onto a target field', () => {
      const containerMember = createMockField({ type: Types.Container, name: 'address' });
      const choiceField = createMockField({
        wrapperKind: 'choice',
        type: Types.Container,
        fields: [containerMember],
      });
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetField = createMockField({ type: Types.String });
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(choiceNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('complex elements');
    });

    it('should allow unselected choice source with only terminal members dropped onto a target field', () => {
      const terminalMember = createMockField({ type: Types.String, name: 'email' });
      const choiceField = createMockField({
        wrapperKind: 'choice',
        type: Types.Container,
        fields: [terminalMember],
      });
      const choiceNode = new ChoiceFieldNodeData(sourceDocNode, choiceField);
      const targetField = createMockField({ type: Types.String });
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(choiceNode, toNode);
      expect(result.isValid).toBe(true);
    });

    it('should reject cross-side drop to unselected abstract target with errorMessage', () => {
      const sourceField = createMockField({ type: Types.String });
      const targetField = createMockField({ wrapperKind: 'abstract', selectedMemberQName: undefined });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
      expect(result.sourceNode).toBe(fromNode);
      expect(result.targetNode).toBe(toNode);
    });

    it('should accept cross-side drop to substituted abstract target', () => {
      const sourceField = createMockField({ type: Types.String });
      const targetField = createMockField({
        wrapperKind: 'abstract',
        selectedMemberQName: new QName(null, 'ConcreteType'),
      });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(true);
      expect(result.sourceNode).toBe(fromNode);
      expect(result.targetNode).toBe(toNode);
    });

    it('should accept cross-side drop to selected choice target', () => {
      const sourceField = createMockField({ type: Types.String });
      const targetField = createMockField({ wrapperKind: 'choice', selectedMemberIndex: 0 });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(fromNode, toNode);
      expect(result.isValid).toBe(true);
      expect(result.sourceNode).toBe(fromNode);
      expect(result.targetNode).toBe(toNode);
    });

    it('should reject variable dropped onto sequence wrapper target', () => {
      const variable = new VariableItem(tree, 'rootVar');
      tree.children.push(variable);
      const sourceNode = new SourceVariableNodeData(variable);
      const seqField = createMockField({ wrapperKind: 'sequence', type: Types.Container });
      const toNode = new TargetSequenceFieldNodeData(targetDocNode, seqField);
      const result = MappingValidationService.validateMappingPair(sourceNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('sequence group');
    });

    it('should accept root-level variable for any target', () => {
      const variable = new VariableItem(tree, 'rootVar');
      tree.children.push(variable);
      const sourceNode = new SourceVariableNodeData(variable);
      const targetField = createMockField({ type: Types.String });
      const toNode = new TargetFieldNodeData(targetDocNode, targetField);
      const result = MappingValidationService.validateMappingPair(sourceNode, toNode);
      expect(result.isValid).toBe(true);
    });

    it('should accept nested variable for a following sibling target', () => {
      const targetField = targetDoc.fields[0].fields[0];
      const rootFieldItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(rootFieldItem);
      const variable = new VariableItem(rootFieldItem, 'scopedVar');
      rootFieldItem.children.push(variable);
      const siblingFieldItem = new FieldItem(rootFieldItem, targetField);
      rootFieldItem.children.push(siblingFieldItem);

      const sourceNode = new SourceVariableNodeData(variable);
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, targetField, siblingFieldItem);
      const result = MappingValidationService.validateMappingPair(sourceNode, targetFieldNode);
      expect(result.isValid).toBe(true);
    });

    it('should reject nested variable for a preceding sibling target', () => {
      const targetField = targetDoc.fields[0].fields[0];
      const rootFieldItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(rootFieldItem);
      const siblingFieldItem = new FieldItem(rootFieldItem, targetField);
      rootFieldItem.children.push(siblingFieldItem);
      const variable = new VariableItem(rootFieldItem, 'scopedVar');
      rootFieldItem.children.push(variable);

      const sourceNode = new SourceVariableNodeData(variable);
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, targetField, siblingFieldItem);
      const result = MappingValidationService.validateMappingPair(sourceNode, targetFieldNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('not in scope');
    });

    it('should reject variable for target in a different container', () => {
      const targetFields = targetDoc.fields[0].fields;
      const containerA = new FieldItem(tree, targetFields[0]);
      tree.children.push(containerA);
      const variable = new VariableItem(containerA, 'localVar');
      containerA.children.push(variable);
      const containerB = new FieldItem(tree, targetFields[1]);
      tree.children.push(containerB);

      const sourceNode = new SourceVariableNodeData(variable);
      const targetFieldNode = new TargetFieldNodeData(targetDocNode, targetFields[1], containerB);
      const result = MappingValidationService.validateMappingPair(sourceNode, targetFieldNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('not in scope');
    });

    it('should accept nested variable for an unmapped following sibling via parent walk', () => {
      const parentField = targetDoc.fields[0];
      const childField = parentField.fields[0];
      const rootFieldItem = new FieldItem(tree, parentField);
      tree.children.push(rootFieldItem);
      const variable = new VariableItem(rootFieldItem, 'scopedVar');
      rootFieldItem.children.push(variable);
      const siblingFieldItem = new FieldItem(rootFieldItem, childField);
      rootFieldItem.children.push(siblingFieldItem);

      const sourceNode = new SourceVariableNodeData(variable);
      const parentFieldNode = new TargetFieldNodeData(targetDocNode, parentField, rootFieldItem);
      const childFieldNode = new TargetFieldNodeData(parentFieldNode, childField);
      const result = MappingValidationService.validateMappingPair(sourceNode, childFieldNode);
      expect(result.isValid).toBe(true);
    });

    it('should reject variable dropped onto unselected choice target', () => {
      const variable = new VariableItem(tree, 'rootVar');
      tree.children.push(variable);
      const sourceNode = new SourceVariableNodeData(variable);
      const choiceField = createMockField({ type: Types.Container, wrapperKind: 'choice' });
      const toNode = new TargetFieldNodeData(targetDocNode, choiceField);
      const result = MappingValidationService.validateMappingPair(sourceNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Select a choice member before mapping');
    });

    it('should reject variable dropped onto unselected abstract target', () => {
      const variable = new VariableItem(tree, 'rootVar');
      tree.children.push(variable);
      const sourceNode = new SourceVariableNodeData(variable);
      const abstractField = createMockField({ type: Types.Container, wrapperKind: 'abstract' });
      const toNode = new TargetFieldNodeData(targetDocNode, abstractField);
      const result = MappingValidationService.validateMappingPair(sourceNode, toNode);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('Configure the abstract field before mapping');
    });

    it('should accept variable dropped onto selected choice target', () => {
      const variable = new VariableItem(tree, 'rootVar');
      tree.children.push(variable);
      const sourceNode = new SourceVariableNodeData(variable);
      const choiceField = createMockField({ type: Types.Container, wrapperKind: 'choice', selectedMemberIndex: 0 });
      const toNode = new TargetFieldNodeData(targetDocNode, choiceField);
      const result = MappingValidationService.validateMappingPair(sourceNode, toNode);
      expect(result.isValid).toBe(true);
    });

    it('should accept variable dropped onto substituted abstract target', () => {
      const variable = new VariableItem(tree, 'rootVar');
      tree.children.push(variable);
      const sourceNode = new SourceVariableNodeData(variable);
      const abstractField = createMockField({
        type: Types.Container,
        wrapperKind: 'abstract',
        selectedMemberQName: new QName(null, 'ConcreteType'),
      });
      const toNode = new TargetFieldNodeData(targetDocNode, abstractField);
      const result = MappingValidationService.validateMappingPair(sourceNode, toNode);
      expect(result.isValid).toBe(true);
    });

    it('should accept nested variable for a deeply unmapped descendant via multi-level parent walk', () => {
      const grandparentField = targetDoc.fields[0];
      const parentField = grandparentField.fields[0];
      const childField = parentField.fields?.[0] ?? createMockField({ type: Types.String });
      const grandparentFieldItem = new FieldItem(tree, grandparentField);
      tree.children.push(grandparentFieldItem);
      const variable = new VariableItem(grandparentFieldItem, 'deepVar');
      grandparentFieldItem.children.push(variable);
      const siblingFieldItem = new FieldItem(grandparentFieldItem, parentField);
      grandparentFieldItem.children.push(siblingFieldItem);

      const sourceNode = new SourceVariableNodeData(variable);
      const grandparentNode = new TargetFieldNodeData(targetDocNode, grandparentField, grandparentFieldItem);
      const parentNode = new TargetFieldNodeData(grandparentNode, parentField);
      const childNode = new TargetFieldNodeData(parentNode, childField);
      const result = MappingValidationService.validateMappingPair(sourceNode, childNode);
      expect(result.isValid).toBe(true);
    });

    it('should reject cross-side drop when target resolves to unknown node type', () => {
      const sourceField = createMockField({ type: Types.String });
      const fromNode = new FieldNodeData(sourceDocNode, sourceField);
      const unknownTarget = { isSource: false, mappingTree: tree } as unknown as TargetNodeData;
      const result = MappingValidationService.validateMappingPair(fromNode, unknownTarget as unknown as NodeData);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeUndefined();
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

    it('should return false for SequenceFieldNodeData', () => {
      const field = createMockField({ wrapperKind: 'sequence' });
      const node = new SequenceFieldNodeData(sourceDocNode, field);
      expect(MappingValidationService.isDraggable(node)).toBe(false);
    });

    it('should return false for TargetSequenceFieldNodeData', () => {
      const field = createMockField({ wrapperKind: 'sequence' });
      const node = new TargetSequenceFieldNodeData(targetDocNode, field);
      expect(MappingValidationService.isDraggable(node)).toBe(false);
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

function createXmlSchemaField(name: string, namespaceURI: string, isAttribute = false): XmlSchemaField {
  const mockParent = {
    path: { documentType: DocumentType.SOURCE_BODY, documentId: 'test', pathSegments: [] },
    isNamespaceAware: true,
  } as unknown as XmlSchemaDocument;

  const field = new XmlSchemaField(mockParent, name, isAttribute);
  field.namespaceURI = namespaceURI;
  field.type = Types.String;
  return field;
}

function createJsonSchemaField(key: string, type: Types): JsonSchemaField {
  const doc = new JsonSchemaDocument(
    new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.JSON_SCHEMA, 'test'),
  );
  return new JsonSchemaField(doc, key, type);
}
