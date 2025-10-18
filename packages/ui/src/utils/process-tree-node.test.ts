import { DocumentTree } from '../models/datamapper/document-tree';
import { DocumentNodeData } from '../models/datamapper/visualization';
import { TreeParsingService } from '../services/tree-parsing.service';
import { XmlSchemaDocument } from '../services/xml-schema-document.service';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { processTreeNode } from './process-tree-node';

describe('processTreeNodeToDepth', () => {
  let targetDoc: XmlSchemaDocument;
  let targetDocNode: DocumentNodeData;
  let tree: DocumentTree;

  beforeEach(() => {
    targetDoc = TestUtil.createTargetOrderDoc();
    targetDocNode = new DocumentNodeData(targetDoc);
    tree = new DocumentTree(targetDocNode);
  });

  it('should process an unparsed DocumentTree until the first level', () => {
    // A single assertion since there's a single level for an unparsed DocumentTree
    expect.assertions(1);

    processTreeNode(tree.root, (treeNode) => {
      expect(treeNode.isParsed).toBe(false);
    });
  });

  it('should process a DocumentTree', () => {
    const processedNodePaths: string[] = [];

    processTreeNode(tree.root, (treeNode) => {
      TreeParsingService.parseTreeNode(treeNode);
      processedNodePaths.push(treeNode.path);
    });

    expect(processedNodePaths).toHaveLength(14);
    expect(processedNodePaths).toEqual([
      //
      'targetBody:Body://',
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-OrderId-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-OrderPerson-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}$/),

      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Name-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Address-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-City-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-ShipTo-\d{4}\/fx-Country-\d{4}$/),

      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Title-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Note-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Quantity-\d{4}$/),
      expect.stringMatching(/^targetBody:Body:\/\/fx-ShipOrder-\d{4}\/fx-Item-\d{4}\/fx-Price-\d{4}$/),
    ]);
  });

  it('should process a complex DocumentTree', () => {
    const sourceDoc = TestUtil.createCamelSpringXsdSourceDoc();
    const sourceDocNode = new DocumentNodeData(sourceDoc);
    tree = new DocumentTree(sourceDocNode);

    TreeParsingService.parseTree(tree);
    const processedNodePaths: string[] = [];

    processTreeNode(tree.root, (treeNode) => {
      processedNodePaths.push(treeNode.path);
    });

    expect(processedNodePaths).toHaveLength(107);
  });

  it('should not throw an error when processing beyond the DocumentTree parsed level', () => {
    const processedNodePaths: string[] = [];
    TreeParsingService.parseTree(tree);

    const fn = () => {
      processTreeNode(
        tree.root,
        (treeNode) => {
          processedNodePaths.push(treeNode.path);
        },
        { maxDepth: Number.MAX_SAFE_INTEGER },
      );
    };

    expect(fn).not.toThrow();
    expect(processedNodePaths).toHaveLength(14);
  });

  it('should stop processing when reaching the max fields count', () => {
    targetDoc = TestUtil.createCamelSpringXsdSourceDoc();
    targetDocNode = new DocumentNodeData(targetDoc);
    tree = new DocumentTree(targetDocNode);
    const processedNodePaths: string[] = [];
    TreeParsingService.parseTree(tree);

    const fn = () => {
      processTreeNode(
        tree.root,
        (treeNode) => {
          processedNodePaths.push(treeNode.path);
        },
        { maxDepth: Number.MAX_SAFE_INTEGER },
      );
    };

    expect(fn).not.toThrow();
    expect(processedNodePaths).toHaveLength(3517);
  });
});
