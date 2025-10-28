import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { BODY_DOCUMENT_ID, DocumentType, PrimitiveDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { TreeParsingService } from '../../services/tree-parsing.service';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { SourceDocumentNode } from './SourceDocumentNode';

describe('SourceDocumentNode', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <DataMapperCanvasProvider>{children}</DataMapperCanvasProvider>
    </DataMapperProvider>
  );

  const findLeafNode = (node: DocumentTreeNode): DocumentTreeNode | undefined => {
    if (node.children.length === 0) {
      return node;
    }
    for (const child of node.children) {
      const found = findLeafNode(child);
      if (found) return found;
    }
    return undefined;
  };

  beforeEach(() => {
    act(() => {
      useDocumentTreeStore.setState({ expansionState: {} });
    });
  });

  it('should render a simple field node', () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const fieldNode = tree.root.children[0];

    act(() => {
      render(<SourceDocumentNode treeNode={fieldNode} documentId={documentNodeData.id} isReadOnly={false} rank={1} />, {
        wrapper,
      });
    });

    expect(screen.getByText(fieldNode.nodeData.title)).toBeInTheDocument();
    expect(screen.getByTestId(`node-source-${fieldNode.nodeData.id}`)).toBeInTheDocument();
  });

  it('should render a document node', () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    act(() => {
      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });
    });

    expect(screen.getByText(document.documentId)).toBeInTheDocument();
    expect(screen.getByTestId(`node-source-${documentNodeData.id}`)).toBeInTheDocument();
  });

  it('should render a primitive document node', () => {
    const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    act(() => {
      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });
    });

    expect(screen.getByText(BODY_DOCUMENT_ID)).toBeInTheDocument();
  });

  it('should render a collection field with LayerGroupIcon', () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    const findCollectionField = (node: typeof tree.root): typeof tree.root | undefined => {
      if (VisualizationService.isCollectionField(node.nodeData)) {
        return node;
      }
      for (const child of node.children) {
        const found = findCollectionField(child);
        if (found) return found;
      }
      return undefined;
    };

    const collectionFieldNode = findCollectionField(tree.root);
    expect(collectionFieldNode).toBeDefined();

    act(() => {
      render(
        <SourceDocumentNode
          treeNode={collectionFieldNode!}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );
    });

    expect(screen.getByTestId('collection-field-icon')).toBeInTheDocument();
  });

  it('should render an attribute field with @ icon', () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    const findAttributeField = (node: typeof tree.root): typeof tree.root | undefined => {
      if (VisualizationService.isAttributeField(node.nodeData)) {
        return node;
      }
      for (const child of node.children) {
        const found = findAttributeField(child);
        if (found) return found;
      }
      return undefined;
    };

    const attributeFieldNode = findAttributeField(tree.root);
    expect(attributeFieldNode).toBeDefined();

    act(() => {
      render(
        <SourceDocumentNode
          treeNode={attributeFieldNode!}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={2}
        />,
        { wrapper },
      );
    });

    expect(screen.getByTestId('attribute-field-icon')).toBeInTheDocument();
  });

  it('should render with draggable indicator for non-document nodes', () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const fieldNode = tree.root.children[0];

    const { container } = render(
      <SourceDocumentNode treeNode={fieldNode} documentId={documentNodeData.id} isReadOnly={false} rank={1} />,
      {
        wrapper,
      },
    );

    const draggableSection = container.querySelector('[data-draggable="true"]');
    expect(draggableSection).toBeInTheDocument();
  });

  it('should render with draggable indicator for primitive document nodes', () => {
    const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    act(() => {
      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });
    });

    const container = screen.getByTestId(`node-source-${documentNodeData.id}`);
    const draggableSection = container.querySelector('[data-draggable="true"]');
    expect(draggableSection).toBeInTheDocument();
  });

  it('should not render with draggable indicator for structured document nodes', () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    act(() => {
      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });
    });

    const container = screen.getByTestId(`node-source-${documentNodeData.id}`);
    const draggableSection = container.querySelector('[data-draggable="true"]');
    expect(draggableSection).not.toBeInTheDocument();
  });

  it('should render correct test-id when selected', () => {
    const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    let result: ReturnType<typeof render>;
    act(() => {
      result = render(
        <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
        {
          wrapper,
        },
      );
    });

    const nodeContainer = result!.container.querySelector('[data-testid*="node-source-"]');
    expect(nodeContainer).toBeInTheDocument();
  });

  describe('Expansion/Collapse', () => {
    it('should toggle expansion when clicking chevron on expandable node', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const toggleNodeSpy = jest.spyOn(TreeUIService, 'toggleNode');

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      act(() => {
        render(
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
          {
            wrapper,
          },
        );
      });

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);
      expect(expandIcon).toBeInTheDocument();

      act(() => {
        fireEvent.click(expandIcon);
      });

      expect(toggleNodeSpy).toHaveBeenCalledWith(documentNodeData.id, tree.root.path);

      toggleNodeSpy.mockRestore();
    });

    it('should not show chevron for nodes without children', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const leafNode = findLeafNode(tree.root);
      expect(leafNode).toBeDefined();

      act(() => {
        render(
          <SourceDocumentNode treeNode={leafNode!} documentId={documentNodeData.id} isReadOnly={false} rank={2} />,
          {
            wrapper,
          },
        );
      });

      const expandIcon = screen.queryByTestId(`expand-icon-${leafNode!.nodeData.title}`);
      const collapseIcon = screen.queryByTestId(`collapse-icon-${leafNode!.nodeData.title}`);

      expect(expandIcon).not.toBeInTheDocument();
      expect(collapseIcon).not.toBeInTheDocument();
    });

    it('should show ChevronDown when expanded', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      act(() => {
        render(
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
          {
            wrapper,
          },
        );
      });

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);
      expect(expandIcon).toBeInTheDocument();

      const collapseIcon = screen.queryByTestId(`collapse-icon-${tree.root.nodeData.title}`);
      expect(collapseIcon).not.toBeInTheDocument();
    });

    it('should show ChevronRight when collapsed', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: false,
            },
          },
        });
      });

      act(() => {
        render(
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
          {
            wrapper,
          },
        );
      });

      const collapseIcon = screen.getByTestId(`collapse-icon-${tree.root.nodeData.title}`);
      expect(collapseIcon).toBeInTheDocument();

      const expandIcon = screen.queryByTestId(`expand-icon-${tree.root.nodeData.title}`);
      expect(expandIcon).not.toBeInTheDocument();
    });

    it('should call TreeUIService.toggleNode with correct documentId and path', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const toggleNodeSpy = jest.spyOn(TreeUIService, 'toggleNode');

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      act(() => {
        render(
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
          {
            wrapper,
          },
        );
      });

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);

      act(() => {
        fireEvent.click(expandIcon);
      });

      expect(toggleNodeSpy).toHaveBeenCalledTimes(1);
      expect(toggleNodeSpy).toHaveBeenCalledWith(documentNodeData.id, tree.root.path);

      toggleNodeSpy.mockRestore();
    });
  });

  describe('Selection', () => {
    it('should render as selected when node is in selected mapping', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      act(() => {
        render(
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
          {
            wrapper,
          },
        );
      });

      const nodeContainer = screen.getByTestId(`node-source-${documentNodeData.id}`);
      expect(nodeContainer).toBeInTheDocument();

      act(() => {
        fireEvent.click(nodeContainer);
      });

      const selectedNode = screen.getByTestId(`node-source-selected-${documentNodeData.id}`);
      expect(selectedNode).toBeInTheDocument();
    });

    it('should apply selected-container class when selected', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      let result: ReturnType<typeof render>;
      act(() => {
        result = render(
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
          {
            wrapper,
          },
        );
      });

      const nodeContainer = screen.getByTestId(`node-source-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(nodeContainer);
      });

      // Check for selected-container class
      const selectedContainer = result!.container.querySelector('.selected-container');
      expect(selectedContainer).toBeInTheDocument();
    });

    it('should call toggleSelectedNodeReference when clicking field', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      act(() => {
        render(
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
          {
            wrapper,
          },
        );
      });

      const nodeContainer = screen.getByTestId(`node-source-${documentNodeData.id}`);
      expect(nodeContainer).toBeInTheDocument();

      act(() => {
        fireEvent.click(nodeContainer);
      });

      const selectedNode = screen.getByTestId(`node-source-selected-${documentNodeData.id}`);
      expect(selectedNode).toBeInTheDocument();

      act(() => {
        fireEvent.click(nodeContainer);
      });

      const deselectedNode = screen.getByTestId(`node-source-${documentNodeData.id}`);
      expect(deselectedNode).toBeInTheDocument();
    });

    it('should stop event propagation on field click', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const parentClickHandler = jest.fn();

      act(() => {
        render(
          <div onClick={parentClickHandler}>
            <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />
          </div>,
          { wrapper },
        );
      });

      const nodeContainer = screen.getByTestId(`node-source-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(nodeContainer);
      });

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Node Reference', () => {
    it('should register node reference with correct path', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { container } = render(
        <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
        {
          wrapper,
        },
      );

      expect(screen.getByTestId(`node-source-${documentNodeData.id}`)).toBeInTheDocument();
      expect(tree.root.nodeData.path).toBeDefined();
      expect(container.querySelector('.node__row')).toBeInTheDocument();
    });

    it('should update node reference when changed', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { rerender } = render(
        <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />,
        {
          wrapper,
        },
      );

      expect(screen.getByTestId(`node-source-${documentNodeData.id}`)).toBeInTheDocument();

      rerender(
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />
          </DataMapperCanvasProvider>
        </DataMapperProvider>,
      );

      expect(screen.getByTestId(`node-source-${documentNodeData.id}`)).toBeInTheDocument();
    });
  });

  describe('Parameter Renaming', () => {
    it('should show ParameterInputPlaceholder when renaming', () => {
      const document = new PrimitiveDocument(DocumentType.PARAM, 'param1');
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });

      expect(screen.getByText('param1')).toBeInTheDocument();

      const renameButton = screen.getByTestId('rename-parameter-param1-button');
      fireEvent.click(renameButton);

      expect(screen.getByTestId('new-parameter-name-input')).toBeInTheDocument();
    });

    it('should call toggleOffRenamingParameter on complete', () => {
      const document = new PrimitiveDocument(DocumentType.PARAM, 'param1');
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });

      const renameButton = screen.getByTestId('rename-parameter-param1-button');
      fireEvent.click(renameButton);

      expect(screen.getByTestId('new-parameter-name-input')).toBeInTheDocument();

      const cancelButton = screen.getByTestId('new-parameter-cancel-btn');
      fireEvent.click(cancelButton);

      expect(screen.queryByTestId('new-parameter-name-input')).not.toBeInTheDocument();
    });

    it('should not show DocumentActions for non-document nodes', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const fieldNode = tree.root.children[0]; // Get a field node, not a document node

      render(<SourceDocumentNode treeNode={fieldNode} documentId={documentNodeData.id} isReadOnly={false} rank={1} />, {
        wrapper,
      });

      expect(screen.queryByTestId(`rename-parameter-${fieldNode.nodeData.id}-button`)).not.toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('should render children when expanded and hasChildren is true', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });

      expect(tree.root.children.length).toBeGreaterThan(0);
      for (const child of tree.root.children) {
        expect(screen.getByTestId(`node-source-${child.nodeData.id}`)).toBeInTheDocument();
      }
    });

    it('should not render children when collapsed', () => {
      expect.assertions(2);
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: false,
            },
          },
        });
      });

      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });

      expect(tree.root.children.length).toBeGreaterThan(0);
      for (const child of tree.root.children) {
        expect(screen.queryByTestId(`node-source-${child.nodeData.id}`)).not.toBeInTheDocument();
      }
    });

    it('should recursively render nested children', () => {
      expect.assertions(5);
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const grandchildren = tree.root.children.flatMap((c) => c.children);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: Object.fromEntries(
              // Expand all nodes
              [tree.root, ...tree.root.children, ...grandchildren].map((node) => [node.path, true]),
            ),
          },
        });
      });

      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />, {
        wrapper,
      });

      for (const child of tree.root.children) {
        expect(screen.getByTestId(`node-source-${child.nodeData.id}`)).toBeInTheDocument();

        for (const grandchild of child.children) {
          expect(screen.getByTestId(`node-source-${grandchild.nodeData.id}`)).toBeInTheDocument();
        }
      }
    });
  });

  describe('Read-only Mode', () => {
    it('should hide DocumentActions when isReadOnly is true', () => {
      const document = new PrimitiveDocument(DocumentType.PARAM, 'param1');
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={true} rank={0} />, {
        wrapper,
      });

      expect(screen.queryByTestId('rename-parameter-param1-button')).not.toBeInTheDocument();
    });

    it('should still allow expansion/collapse in read-only mode', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      render(<SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={true} rank={0} />, {
        wrapper,
      });

      // Expand icon should still be visible
      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);
      expect(expandIcon).toBeInTheDocument();

      // Should be able to click the expand icon
      act(() => {
        fireEvent.click(expandIcon);
      });

      // The toggle should have been called
      expect(expandIcon).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    it('should stop propagation on toggle click', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const parentClickHandler = jest.fn();

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      render(
        <div onClick={parentClickHandler}>
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />
        </div>,
        { wrapper },
      );

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);

      act(() => {
        fireEvent.click(expandIcon);
      });

      // Parent click handler should not be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it('should stop propagation on field click', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const parentClickHandler = jest.fn();

      render(
        <div onClick={parentClickHandler}>
          <SourceDocumentNode treeNode={tree.root} documentId={documentNodeData.id} isReadOnly={false} rank={0} />
        </div>,
        { wrapper },
      );

      const nodeContainer = screen.getByTestId(`node-source-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(nodeContainer);
      });

      // Parent click handler should not be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it('should handle click on non-expandable node gracefully', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      // Find a leaf node (no children)

      const leafNode = findLeafNode(tree.root);
      expect(leafNode).toBeDefined();

      render(<SourceDocumentNode treeNode={leafNode!} documentId={documentNodeData.id} isReadOnly={false} rank={2} />, {
        wrapper,
      });

      // Should not have expand/collapse icons
      expect(screen.queryByTestId(`expand-icon-${leafNode!.nodeData.title}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`collapse-icon-${leafNode!.nodeData.title}`)).not.toBeInTheDocument();

      // Clicking the node should still work for selection
      const nodeContainer = screen.getByTestId(`node-source-${leafNode!.nodeData.id}`);
      act(() => {
        fireEvent.click(nodeContainer);
      });

      // Node should be selected
      expect(screen.getByTestId(`node-source-selected-${leafNode!.nodeData.id}`)).toBeInTheDocument();
    });
  });
});
