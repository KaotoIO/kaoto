import { DocumentDefinitionType } from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import {
  AbstractFieldNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
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
      } as unknown as (typeof sourceDoc.fields)[0];
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
      } as unknown as (typeof sourceDoc.fields)[0];
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
      } as unknown as (typeof sourceDoc.fields)[0];
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
      } as unknown as (typeof sourceDoc.fields)[0];
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
});
