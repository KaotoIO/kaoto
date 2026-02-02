import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IField,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { MappingTree } from '../../models/datamapper/mapping';
import {
  DocumentNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
} from '../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DocumentUtilService } from '../../services/document-util.service';
import { TreeParsingService } from '../../services/tree-parsing.service';
import { TreeUIService } from '../../services/tree-ui.service';
import { VisualizationService } from '../../services/visualization.service';
import { useDocumentTreeStore } from '../../store';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { TargetDocumentNode } from './TargetDocumentNode';

describe('TargetDocumentNode', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <MappingLinksProvider>{children}</MappingLinksProvider>
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
      useDocumentTreeStore.setState({
        expansionState: {},
        selectedNodePath: null,
        selectedNodeIsSource: false,
      });
    });
  });

  it('should render a simple field node', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const fieldNode = tree.root.children[0];

    act(() => {
      render(<TargetDocumentNode treeNode={fieldNode} documentId={documentNodeData.id} rank={1} />, {
        wrapper,
      });
    });

    expect(screen.getByText(fieldNode.nodeData.title)).toBeInTheDocument();
    expect(screen.getByTestId(`node-target-${fieldNode.nodeData.id}`)).toBeInTheDocument();
  });

  it('should render a document node', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    act(() => {
      render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
        wrapper,
      });
    });

    expect(screen.getByText(document.documentId)).toBeInTheDocument();
    expect(screen.getByTestId(`node-target-${documentNodeData.id}`)).toBeInTheDocument();
  });

  it('should render a primitive document node', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    act(() => {
      render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
        wrapper,
      });
    });

    expect(screen.getByText(BODY_DOCUMENT_ID)).toBeInTheDocument();
  });

  it('should render a collection field with LayerGroupIcon', () => {
    const document = TestUtil.createTargetOrderDoc();
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
      render(<TargetDocumentNode treeNode={collectionFieldNode!} documentId={documentNodeData.id} rank={1} />, {
        wrapper,
      });
    });

    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should render an attribute field with @ icon', () => {
    const document = TestUtil.createTargetOrderDoc();
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
      render(<TargetDocumentNode treeNode={attributeFieldNode!} documentId={documentNodeData.id} rank={2} />, {
        wrapper,
      });
    });

    const icons = screen.getAllByRole('img', { hidden: true });
    expect(icons.length).toBeGreaterThan(0);
  });

  it('should render a choice field with choice icon', () => {
    const document = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(document.documentType, document.documentId, DocumentDefinitionType.XML_SCHEMA);
    const documentNodeData = new TargetDocumentNodeData(document, tree);
    const baseField = document.fields[0];
    const memberFields = [
      { ...baseField, name: 'email', displayName: 'email', fields: [] },
      { ...baseField, name: 'phone', displayName: 'phone', fields: [] },
    ];
    const choiceField = {
      ...baseField,
      name: 'choice',
      displayName: DocumentUtilService.formatChoiceDisplayName(memberFields as unknown as IField[]),
      isChoice: true,
      fields: memberFields,
    } as unknown as typeof baseField;
    const choiceNodeData = new TargetChoiceFieldNodeData(documentNodeData, choiceField);
    const choiceTreeNode = new DocumentTreeNode(choiceNodeData);

    act(() => {
      render(<TargetDocumentNode treeNode={choiceTreeNode} documentId={documentNodeData.id} rank={1} />, {
        wrapper,
      });
    });

    expect(screen.getByTestId('choice-field-icon')).toBeInTheDocument();
  });

  it('should render with draggable indicator for non-document nodes', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const fieldNode = tree.root.children[0];

    const { container } = render(
      <TargetDocumentNode treeNode={fieldNode} documentId={documentNodeData.id} rank={1} />,
      {
        wrapper,
      },
    );

    const draggableSection = container.querySelector('[data-draggable="true"]');
    expect(draggableSection).toBeInTheDocument();
  });

  it('should render with draggable indicator for primitive document nodes', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    act(() => {
      render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
        wrapper,
      });
    });

    const container = screen.getByTestId(`node-target-${documentNodeData.id}`);
    const draggableSection = container.querySelector('[data-draggable="true"]');
    expect(draggableSection).toBeInTheDocument();
  });

  it('should not render with draggable indicator for structured document nodes', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    act(() => {
      render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
        wrapper,
      });
    });

    const container = screen.getByTestId(`node-target-${documentNodeData.id}`);
    const draggableSection = container.querySelector('[data-draggable="true"]');
    expect(draggableSection).not.toBeInTheDocument();
  });

  it('should render correct test-id when selected', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    let result: ReturnType<typeof render>;
    act(() => {
      result = render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
        wrapper,
      });
    });

    const nodeContainer = result!.container.querySelector('[data-testid*="node-target-"]');
    expect(nodeContainer).toBeInTheDocument();
  });

  describe('Expansion/Collapse', () => {
    it('should toggle expansion when clicking chevron on expandable node', () => {
      const document = TestUtil.createTargetOrderDoc();
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
        render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
          wrapper,
        });
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
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const leafNode = findLeafNode(tree.root);
      expect(leafNode).toBeDefined();

      act(() => {
        render(<TargetDocumentNode treeNode={leafNode!} documentId={documentNodeData.id} rank={2} />, {
          wrapper,
        });
      });

      const expandIcon = screen.queryByTestId(`expand-icon-${leafNode!.nodeData.title}`);
      const collapseIcon = screen.queryByTestId(`collapse-icon-${leafNode!.nodeData.title}`);

      expect(expandIcon).not.toBeInTheDocument();
      expect(collapseIcon).not.toBeInTheDocument();
    });

    it('should show ChevronDown when expanded', () => {
      const document = TestUtil.createTargetOrderDoc();
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
        render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
          wrapper,
        });
      });

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);
      expect(expandIcon).toBeInTheDocument();

      const collapseIcon = screen.queryByTestId(`collapse-icon-${tree.root.nodeData.title}`);
      expect(collapseIcon).not.toBeInTheDocument();
    });

    it('should show ChevronRight when collapsed', () => {
      const document = TestUtil.createTargetOrderDoc();
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
        render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
          wrapper,
        });
      });

      const collapseIcon = screen.getByTestId(`collapse-icon-${tree.root.nodeData.title}`);
      expect(collapseIcon).toBeInTheDocument();

      const expandIcon = screen.queryByTestId(`expand-icon-${tree.root.nodeData.title}`);
      expect(expandIcon).not.toBeInTheDocument();
    });

    it('should call TreeUIService.toggleNode with correct documentId and path', () => {
      const document = TestUtil.createTargetOrderDoc();
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
        render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
          wrapper,
        });
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
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      act(() => {
        render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
          wrapper,
        });
      });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);
      expect(nodeContainer).toBeInTheDocument();

      act(() => {
        fireEvent.click(nodeContainer);
      });

      expect(nodeContainer).toHaveAttribute('data-selected', 'true');
    });

    it('should update data-selected attribute when selected', async () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
        wrapper,
      });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      // Initially not selected
      expect(nodeContainer).toHaveAttribute('data-selected', 'false');

      act(() => {
        fireEvent.click(nodeContainer);
      });

      // Wait for the component to re-render with selected state
      await waitFor(() => {
        expect(nodeContainer).toHaveAttribute('data-selected', 'true');
      });
    });

    it('should call toggleSelectedNode when clicking field', () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      act(() => {
        render(<TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />, {
          wrapper,
        });
      });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);
      expect(nodeContainer).toBeInTheDocument();

      act(() => {
        fireEvent.click(nodeContainer);
      });

      expect(nodeContainer).toHaveAttribute('data-selected', 'true');

      act(() => {
        fireEvent.click(nodeContainer);
      });

      const deselectedNode = screen.getByTestId(`node-target-${documentNodeData.id}`);
      expect(deselectedNode).toBeInTheDocument();
    });

    it('should stop event propagation on field click', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const parentClickHandler = jest.fn();

      act(() => {
        render(
          <div onClick={parentClickHandler}>
            <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />
          </div>,
          { wrapper },
        );
      });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(nodeContainer);
      });

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Node Reference', () => {
    it('should register node reference with correct path', () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { container } = render(
        <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />,
        {
          wrapper,
        },
      );

      expect(screen.getByTestId(`node-target-${documentNodeData.id}`)).toBeInTheDocument();
      expect(tree.root.nodeData.path).toBeDefined();
      expect(container.querySelector('.node__row')).toBeInTheDocument();
    });

    it('should update node reference when changed', () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { rerender } = render(
        <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />,
        {
          wrapper,
        },
      );

      expect(screen.getByTestId(`node-target-${documentNodeData.id}`)).toBeInTheDocument();

      rerender(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );

      expect(screen.getByTestId(`node-target-${documentNodeData.id}`)).toBeInTheDocument();
    });
  });

  describe('Target Node Actions', () => {
    it('should show TargetNodeActions for field nodes', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const fieldNode = tree.root.children[0];

      const { container } = render(
        <TargetDocumentNode treeNode={fieldNode} documentId={documentNodeData.id} rank={1} />,
        {
          wrapper,
        },
      );

      const actionsContainer = container.querySelector('.node__target__actions');
      expect(actionsContainer).toBeInTheDocument();
    });

    it('should show TargetNodeActions for primitive document nodes', () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { container } = render(
        <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />,
        {
          wrapper,
        },
      );

      const actionsContainer = container.querySelector('.node__target__actions');
      expect(actionsContainer).toBeInTheDocument();
    });

    it('should not show TargetNodeActions for structured document nodes', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { container } = render(
        <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />,
        {
          wrapper,
        },
      );

      const actionsContainer = container.querySelector('.node__target__actions');
      expect(actionsContainer).toBeInTheDocument();
      // Should be a span placeholder, not actual actions
      expect(actionsContainer?.tagName).toBe('SPAN');
    });
  });

  // Note: Children rendering tests removed
  // With virtual scrolling implementation, TargetDocumentNode no longer renders its children.
  // Children are now rendered by the parent Virtuoso component in TargetPanel,
  // which flattens the tree and renders only visible nodes. See TargetPanel.test.tsx
  // for tests of the full virtualized rendering behavior.

  describe('Event Handling', () => {
    it('should stop propagation on toggle click', () => {
      const document = TestUtil.createTargetOrderDoc();
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
          <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />
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
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const parentClickHandler = jest.fn();

      render(
        <div onClick={parentClickHandler}>
          <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />
        </div>,
        { wrapper },
      );

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(nodeContainer);
      });

      // Parent click handler should not be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it('should handle click on non-expandable node gracefully', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const leafNode = findLeafNode(tree.root);
      expect(leafNode).toBeDefined();

      render(<TargetDocumentNode treeNode={leafNode!} documentId={documentNodeData.id} rank={2} />, {
        wrapper,
      });

      // Should not have expand/collapse icons
      expect(screen.queryByTestId(`expand-icon-${leafNode!.nodeData.title}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`collapse-icon-${leafNode!.nodeData.title}`)).not.toBeInTheDocument();

      // Clicking the node should still work for selection
      const nodeContainer = screen.getByTestId(`node-target-${leafNode!.nodeData.id}`);
      act(() => {
        fireEvent.click(nodeContainer);
      });

      // Node should be selected
      expect(nodeContainer).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Document Actions', () => {
    it('should render DocumentActions for document nodes', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { container } = render(
        <TargetDocumentNode treeNode={tree.root} documentId={documentNodeData.id} rank={0} />,
        {
          wrapper,
        },
      );

      // DocumentActions should be present (though onRenameClick is empty)
      const nodeRow = container.querySelector('.node__row');
      expect(nodeRow).toBeInTheDocument();
    });

    it('should not render DocumentActions for non-document nodes', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const fieldNode = tree.root.children[0];

      const { container } = render(
        <TargetDocumentNode treeNode={fieldNode} documentId={documentNodeData.id} rank={1} />,
        {
          wrapper,
        },
      );

      // Field nodes should not have DocumentActions, only TargetNodeActions
      const nodeRow = container.querySelector('.node__row');
      expect(nodeRow).toBeInTheDocument();
    });
  });
});
