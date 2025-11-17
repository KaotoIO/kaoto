import { DocumentTreeNode } from './document-tree-node';
import { NodePath } from './nodepath';
import { NodeData } from './visualization';

describe('DocumentTreeNode', () => {
  let mockNodeData: NodeData;
  let mockChildNodeData: NodeData;

  beforeEach(() => {
    mockNodeData = {
      title: 'Root Node',
      id: 'root-1',
      path: new NodePath('sourceBody:docId://'),
      isSource: true,
      isPrimitive: false,
    };

    mockChildNodeData = {
      title: 'Child Node',
      id: 'child-1',
      path: NodePath.childOf(mockNodeData.path, 'child-1'),
      isSource: true,
      isPrimitive: false,
    };
  });

  describe('constructor', () => {
    it('should create a DocumentTreeNode with nodeData and no parent', () => {
      const node = new DocumentTreeNode(mockNodeData);

      expect(node.nodeData).toBe(mockNodeData);
      expect(node.parent).toBeUndefined();
      expect(node.path).toBe('sourceBody:docId://');
      expect(node.isParsed).toBe(false);
      expect(node.children).toEqual([]);
    });

    it('should create a DocumentTreeNode with a parent', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);
      const childNode = new DocumentTreeNode(mockChildNodeData, parentNode);

      expect(childNode.nodeData).toBe(mockChildNodeData);
      expect(childNode.parent).toBe(parentNode);
      expect(childNode.path).toBe('sourceBody:docId://child-1');
      expect(childNode.isParsed).toBe(false);
      expect(childNode.children).toEqual([]);
    });

    it('should extract path string from NodePath', () => {
      const nodePath = new NodePath('targetBody:targetDoc://field/subfield');
      const nodeData: NodeData = {
        title: 'Target Node',
        id: 'target-1',
        path: nodePath,
        isSource: false,
        isPrimitive: false,
      };

      const node = new DocumentTreeNode(nodeData);

      expect(node.path).toBe('targetBody:targetDoc://field/subfield');
    });
  });

  describe('addChild', () => {
    it('should add a child node and return it', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);
      const childNode = parentNode.addChild(mockChildNodeData);

      expect(childNode).toBeInstanceOf(DocumentTreeNode);
      expect(childNode.nodeData).toBe(mockChildNodeData);
      expect(childNode.parent).toBe(parentNode);
      expect(parentNode.children).toHaveLength(1);
      expect(parentNode.children[0]).toBe(childNode);
    });

    it('should mark parent as parsed when adding a child', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);

      expect(parentNode.isParsed).toBe(false);

      parentNode.addChild(mockChildNodeData);

      expect(parentNode.isParsed).toBe(true);
    });

    it('should add multiple children correctly', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);

      const childNodeData2: NodeData = {
        title: 'Child Node 2',
        id: 'child-2',
        path: NodePath.childOf(mockNodeData.path, 'child-2'),
        isSource: true,
        isPrimitive: false,
      };

      const childNodeData3: NodeData = {
        title: 'Child Node 3',
        id: 'child-3',
        path: NodePath.childOf(mockNodeData.path, 'child-3'),
        isSource: true,
        isPrimitive: false,
      };

      const child1 = parentNode.addChild(mockChildNodeData);
      const child2 = parentNode.addChild(childNodeData2);
      const child3 = parentNode.addChild(childNodeData3);

      expect(parentNode.children).toHaveLength(3);
      expect(parentNode.children[0]).toBe(child1);
      expect(parentNode.children[1]).toBe(child2);
      expect(parentNode.children[2]).toBe(child3);
      expect(parentNode.isParsed).toBe(true);
    });

    it('should maintain parent-child relationship correctly', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);
      const childNode = parentNode.addChild(mockChildNodeData);

      expect(childNode.parent).toBe(parentNode);
      expect(parentNode.children.includes(childNode)).toBe(true);
    });
  });

  describe('getChildren', () => {
    it('should return empty array for node with no children', () => {
      const node = new DocumentTreeNode(mockNodeData);

      expect(node.getChildren()).toEqual([]);
      expect(node.getChildren()).toHaveLength(0);
    });

    it('should return all children', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);
      const child1 = parentNode.addChild(mockChildNodeData);

      const childNodeData2: NodeData = {
        title: 'Child Node 2',
        id: 'child-2',
        path: NodePath.childOf(mockNodeData.path, 'child-2'),
        isSource: true,
        isPrimitive: false,
      };
      const child2 = parentNode.addChild(childNodeData2);

      const children = parentNode.getChildren();

      expect(children).toHaveLength(2);
      expect(children[0]).toBe(child1);
      expect(children[1]).toBe(child2);
    });

    it('should return a reference to the children array', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);
      parentNode.addChild(mockChildNodeData);

      const children1 = parentNode.getChildren();
      const children2 = parentNode.getChildren();

      expect(children1).toBe(children2);
      expect(children1).toBe(parentNode.children);
    });
  });

  describe('findByPath', () => {
    it('should find itself by its own path', () => {
      const node = new DocumentTreeNode(mockNodeData);

      const found = node.findByPath('sourceBody:docId://');

      expect(found).toBe(node);
    });

    it('should return undefined when path does not exist', () => {
      const node = new DocumentTreeNode(mockNodeData);

      const found = node.findByPath('sourceBody:nonexistent://');

      expect(found).toBeUndefined();
    });

    it('should find a direct child by path', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);
      const childNode = parentNode.addChild(mockChildNodeData);

      const found = parentNode.findByPath('sourceBody:docId://child-1');

      expect(found).toBe(childNode);
    });

    it('should find a deeply nested child by path', () => {
      const rootNode = new DocumentTreeNode(mockNodeData);
      const level1NodeData: NodeData = {
        title: 'Level 1',
        id: 'level1',
        path: NodePath.childOf(mockNodeData.path, 'level1'),
        isSource: true,
        isPrimitive: false,
      };
      const level1Node = rootNode.addChild(level1NodeData);

      const level2NodeData: NodeData = {
        title: 'Level 2',
        id: 'level2',
        path: NodePath.childOf(level1NodeData.path, 'level2'),
        isSource: true,
        isPrimitive: false,
      };
      const level2Node = level1Node.addChild(level2NodeData);

      const level3NodeData: NodeData = {
        title: 'Level 3',
        id: 'level3',
        path: NodePath.childOf(level2NodeData.path, 'level3'),
        isSource: true,
        isPrimitive: false,
      };
      const level3Node = level2Node.addChild(level3NodeData);

      const found = rootNode.findByPath('sourceBody:docId://level1/level2/level3');

      expect(found).toBe(level3Node);
    });

    it('should return undefined for partial path match', () => {
      const rootNode = new DocumentTreeNode(mockNodeData);
      const level1NodeData: NodeData = {
        title: 'Level 1',
        id: 'level1',
        path: NodePath.childOf(mockNodeData.path, 'level1'),
        isSource: true,
        isPrimitive: false,
      };
      rootNode.addChild(level1NodeData);

      const found = rootNode.findByPath('sourceBody:docId://level1/nonexistent');

      expect(found).toBeUndefined();
    });

    it('should find among multiple siblings', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);

      const child1Data: NodeData = {
        title: 'Child 1',
        id: 'child-1',
        path: NodePath.childOf(mockNodeData.path, 'child-1'),
        isSource: true,
        isPrimitive: false,
      };
      parentNode.addChild(child1Data);

      const child2Data: NodeData = {
        title: 'Child 2',
        id: 'child-2',
        path: NodePath.childOf(mockNodeData.path, 'child-2'),
        isSource: true,
        isPrimitive: false,
      };
      const child2 = parentNode.addChild(child2Data);

      const child3Data: NodeData = {
        title: 'Child 3',
        id: 'child-3',
        path: NodePath.childOf(mockNodeData.path, 'child-3'),
        isSource: true,
        isPrimitive: false,
      };
      parentNode.addChild(child3Data);

      const found = parentNode.findByPath('sourceBody:docId://child-2');

      expect(found).toBe(child2);
    });

    it('should find in complex tree structure', () => {
      const rootNode = new DocumentTreeNode(mockNodeData);

      // Create branch 1
      const branch1Data: NodeData = {
        title: 'Branch 1',
        id: 'branch1',
        path: NodePath.childOf(mockNodeData.path, 'branch1'),
        isSource: true,
        isPrimitive: false,
      };
      const branch1 = rootNode.addChild(branch1Data);

      const leaf1Data: NodeData = {
        title: 'Leaf 1',
        id: 'leaf1',
        path: NodePath.childOf(branch1Data.path, 'leaf1'),
        isSource: true,
        isPrimitive: false,
      };
      branch1.addChild(leaf1Data);

      // Create branch 2
      const branch2Data: NodeData = {
        title: 'Branch 2',
        id: 'branch2',
        path: NodePath.childOf(mockNodeData.path, 'branch2'),
        isSource: true,
        isPrimitive: false,
      };
      const branch2 = rootNode.addChild(branch2Data);

      const leaf2Data: NodeData = {
        title: 'Leaf 2',
        id: 'leaf2',
        path: NodePath.childOf(branch2Data.path, 'leaf2'),
        isSource: true,
        isPrimitive: false,
      };
      const leaf2 = branch2.addChild(leaf2Data);

      const found = rootNode.findByPath('sourceBody:docId://branch2/leaf2');

      expect(found).toBe(leaf2);
    });

    it('should handle different document types', () => {
      const targetNodeData: NodeData = {
        title: 'Target Root',
        id: 'target-root',
        path: new NodePath('targetBody:targetDoc://'),
        isSource: false,
        isPrimitive: false,
      };
      const targetNode = new DocumentTreeNode(targetNodeData);

      const found = targetNode.findByPath('targetBody:targetDoc://');

      expect(found).toBe(targetNode);
    });

    it('should return undefined for empty tree when searching for non-existent path', () => {
      const node = new DocumentTreeNode(mockNodeData);

      const found = node.findByPath('sourceBody:other://field');

      expect(found).toBeUndefined();
    });
  });

  describe('isParsed flag', () => {
    it('should initialize as false', () => {
      const node = new DocumentTreeNode(mockNodeData);

      expect(node.isParsed).toBe(false);
    });

    it('should be set to true after adding first child', () => {
      const node = new DocumentTreeNode(mockNodeData);

      expect(node.isParsed).toBe(false);

      node.addChild(mockChildNodeData);

      expect(node.isParsed).toBe(true);
    });

    it('should remain true after adding multiple children', () => {
      const node = new DocumentTreeNode(mockNodeData);

      node.addChild(mockChildNodeData);
      expect(node.isParsed).toBe(true);

      const child2Data: NodeData = {
        title: 'Child 2',
        id: 'child-2',
        path: NodePath.childOf(mockNodeData.path, 'child-2'),
        isSource: true,
        isPrimitive: false,
      };
      node.addChild(child2Data);

      expect(node.isParsed).toBe(true);
    });

    it('should not affect child nodes isParsed status', () => {
      const parentNode = new DocumentTreeNode(mockNodeData);
      const childNode = parentNode.addChild(mockChildNodeData);

      expect(parentNode.isParsed).toBe(true);
      expect(childNode.isParsed).toBe(false);
    });
  });

  describe('tree integrity', () => {
    it('should maintain correct parent references throughout the tree', () => {
      const root = new DocumentTreeNode(mockNodeData);
      const level1Data: NodeData = {
        title: 'Level 1',
        id: 'level1',
        path: NodePath.childOf(mockNodeData.path, 'level1'),
        isSource: true,
        isPrimitive: false,
      };
      const level1 = root.addChild(level1Data);

      const level2Data: NodeData = {
        title: 'Level 2',
        id: 'level2',
        path: NodePath.childOf(level1Data.path, 'level2'),
        isSource: true,
        isPrimitive: false,
      };
      const level2 = level1.addChild(level2Data);

      expect(root.parent).toBeUndefined();
      expect(level1.parent).toBe(root);
      expect(level2.parent).toBe(level1);
    });

    it('should maintain correct path hierarchy', () => {
      const root = new DocumentTreeNode(mockNodeData);
      const level1Data: NodeData = {
        title: 'Level 1',
        id: 'level1',
        path: NodePath.childOf(mockNodeData.path, 'level1'),
        isSource: true,
        isPrimitive: false,
      };
      const level1 = root.addChild(level1Data);

      const level2Data: NodeData = {
        title: 'Level 2',
        id: 'level2',
        path: NodePath.childOf(level1Data.path, 'level2'),
        isSource: true,
        isPrimitive: false,
      };
      level1.addChild(level2Data);

      expect(root.path).toBe('sourceBody:docId://');
      expect(level1.path).toBe('sourceBody:docId://level1');
      expect(level2Data.path.toString()).toBe('sourceBody:docId://level1/level2');
    });
  });

  describe('edge cases', () => {
    it('should handle primitive document nodes', () => {
      const primitiveNodeData: NodeData = {
        title: 'Primitive Node',
        id: 'primitive-1',
        path: new NodePath('sourceBody:primitiveDoc://'),
        isSource: true,
        isPrimitive: true,
      };
      const node = new DocumentTreeNode(primitiveNodeData);

      expect(node.nodeData.isPrimitive).toBe(true);
    });

    it('should handle target document nodes', () => {
      const targetNodeData: NodeData = {
        title: 'Target Node',
        id: 'target-1',
        path: new NodePath('targetBody:targetDoc://'),
        isSource: false,
        isPrimitive: false,
      };
      const node = new DocumentTreeNode(targetNodeData);

      expect(node.nodeData.isSource).toBe(false);
    });

    it('should handle nodes with parameter document type', () => {
      const paramNodeData: NodeData = {
        title: 'Param Node',
        id: 'param-1',
        path: new NodePath('param:globalVar://'),
        isSource: true,
        isPrimitive: false,
      };
      const node = new DocumentTreeNode(paramNodeData);

      expect(node.path).toBe('param:globalVar://');
    });

    it('should handle empty children array correctly', () => {
      const node = new DocumentTreeNode(mockNodeData);

      expect(node.children).toBeDefined();
      expect(Array.isArray(node.children)).toBe(true);
      expect(node.children.length).toBe(0);
    });
  });
});
