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
});
