import { VisualizationService } from './visualization.service';
import { TargetDocumentNodeData, TargetFieldNodeData, TargetNodeData } from '../models/visualization';
import { MappingTree } from '../models/mapping';
import { TestUtil } from '../test/test-util';

describe('VisualizationService', () => {
  const targetDoc = TestUtil.createTargetOrderDoc();

  describe('applyIf()', () => {
    it('should add If', () => {
      const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
      let docNode = new TargetDocumentNodeData(targetDoc, tree);
      let docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      expect(docChildren.length).toEqual(1);
      let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
      expect(shipOrderChildren.length).toEqual(4);
      expect(shipOrderChildren[0].title).toEqual('OrderId');
      VisualizationService.applyIf(shipOrderChildren[0] as TargetNodeData);
      expect(tree.children[0].name).toEqual('field-ShipOrder');
      expect(tree.children[0].children[0].name).toEqual('if');
      docNode = new TargetDocumentNodeData(targetDoc, tree);
      docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
      expect(shipOrderChildren[0].title).toEqual('if');
      const ifChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[0]);
      expect(ifChildren.length).toEqual(1);
      expect(ifChildren[0].title).toEqual('OrderId');
    });
  });

  describe('applyChooseWhenOtherwise()', () => {
    it('should add Choose-When-Otherwise', () => {
      const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
      let docNode = new TargetDocumentNodeData(targetDoc, tree);
      let docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      expect(docChildren.length).toEqual(1);
      let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
      expect(shipOrderChildren.length).toEqual(4);
      expect(shipOrderChildren[1].title).toEqual('OrderPerson');
      VisualizationService.applyChooseWhenOtherwise(shipOrderChildren[1] as TargetNodeData);
      expect(tree.children[0].name).toEqual('field-ShipOrder');
      expect(tree.children[0].children[0].name).toEqual('choose');
      docNode = new TargetDocumentNodeData(targetDoc, tree);
      docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
      expect(shipOrderChildren[1].title).toEqual('choose');
      const chooseChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[1]);
      expect(chooseChildren.length).toEqual(2);
      expect(chooseChildren[0].title).toEqual('when');
      const whenChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[0]);
      expect(whenChildren.length).toEqual(1);
      expect(whenChildren[0].title).toEqual('OrderPerson');
      expect(chooseChildren[1].title).toEqual('otherwise');
      const otherwiseChildren = VisualizationService.generateNonDocumentNodeDataChildren(chooseChildren[1]);
      expect(otherwiseChildren.length).toEqual(1);
      expect(otherwiseChildren[0].title).toEqual('OrderPerson');
    });
  });

  describe('applyForEach()', () => {
    it('should add for-each', () => {
      const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId);
      let docNode = new TargetDocumentNodeData(targetDoc, tree);
      let docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      expect(docChildren.length).toEqual(1);
      let shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
      expect(shipOrderChildren.length).toEqual(4);
      expect(shipOrderChildren[3].title).toEqual('Item');
      VisualizationService.applyForEach(shipOrderChildren[3] as TargetFieldNodeData);
      docNode = new TargetDocumentNodeData(targetDoc, tree);
      docChildren = VisualizationService.generateStructuredDocumentChildren(docNode);
      shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(docChildren[0]);
      expect(shipOrderChildren[3].title).toEqual('for-each');
      const forEachChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderChildren[3]);
      expect(forEachChildren.length).toEqual(1);
      expect(forEachChildren[0].title).toEqual('Item');
    });
  });
});
