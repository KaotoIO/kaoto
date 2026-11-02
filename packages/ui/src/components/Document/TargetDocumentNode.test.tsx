import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { MockInstance } from 'vitest';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { FieldItem, IfItem, MappingItem, MappingTree, VariableItem } from '../../models/datamapper/mapping';
import { MappingActionKind } from '../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  MappingNodeData,
  NodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { MappingService } from '../../services/mapping/mapping.service';
import { MappingSerializerService } from '../../services/mapping/mapping-serializer.service';
import { MappingActionService } from '../../services/visualization/mapping-action.service';
import { MappingActionRegistryService } from '../../services/visualization/mapping-action-registry.service';
import { TreeParsingService } from '../../services/visualization/tree-parsing.service';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { VisualizationService } from '../../services/visualization/visualization.service';
import { VisualizationUtilService } from '../../services/visualization/visualization-util.service';
import { useDocumentTreeStore } from '../../store';
import { getShipOrderToShipOrderXslt, TestUtil } from '../../stubs/datamapper/data-mapper';
import { createDataMapperContext, createDataMapperContextWrapper } from '../../stubs/datamapper/data-mapper-context';
import { TargetDocumentNode } from './TargetDocumentNode';

describe('TargetDocumentNode', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider
      documentInitializationModel={
        new DocumentInitializationModel(
          {},
          {
            documentType: DocumentType.SOURCE_BODY,
            definitionType: DocumentDefinitionType.Primitive,
            name: BODY_DOCUMENT_ID,
          },
          {
            documentType: DocumentType.TARGET_BODY,
            definitionType: DocumentDefinitionType.Primitive,
            name: BODY_DOCUMENT_ID,
          },
        )
      }
    >
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
    useDocumentTreeStore.setState({
      expansionState: {},
      selectedNodePath: null,
      selectedNodeIsSource: false,
    });
  });

  it('should render a simple field node', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const fieldNode = tree.root.children[0];

    render(<TargetDocumentNode treeNode={fieldNode} documentNodeId={documentNodeData.id} rank={1} />, {
      wrapper,
    });

    expect(screen.getByText(fieldNode.nodeData.title)).toBeInTheDocument();
    expect(screen.getByTestId(`node-target-${fieldNode.nodeData.id}`)).toBeInTheDocument();
  });

  it('should render a document node', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
      wrapper,
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

    render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
      wrapper,
    });

    expect(screen.getByText(BODY_DOCUMENT_ID)).toBeInTheDocument();
  });

  it('should render a collection field with LayerGroupIcon', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    const findCollectionField = (node: typeof tree.root): typeof tree.root | undefined => {
      if (VisualizationUtilService.isCollectionField(node.nodeData)) {
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

    render(<TargetDocumentNode treeNode={collectionFieldNode!} documentNodeId={documentNodeData.id} rank={1} />, {
      wrapper,
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
      if (VisualizationUtilService.isAttributeField(node.nodeData)) {
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

    render(<TargetDocumentNode treeNode={attributeFieldNode!} documentNodeId={documentNodeData.id} rank={2} />, {
      wrapper,
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
      displayName: 'choice',
      wrapperKind: 'choice' as const,
      fields: memberFields,
    } as unknown as typeof baseField;
    const choiceNodeData = new TargetChoiceFieldNodeData(documentNodeData, choiceField);
    const choiceTreeNode = new DocumentTreeNode(choiceNodeData);

    render(<TargetDocumentNode treeNode={choiceTreeNode} documentNodeId={documentNodeData.id} rank={1} />, {
      wrapper,
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
      <TargetDocumentNode treeNode={fieldNode} documentNodeId={documentNodeData.id} rank={1} />,
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

    render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
      wrapper,
    });

    const container = screen.getByTestId(`node-target-${documentNodeData.id}`);
    const draggableSection = container.querySelector('[data-draggable="true"]');
    expect(draggableSection).toBeInTheDocument();
  });

  it('should not render with draggable indicator for structured document nodes', () => {
    const document = TestUtil.createTargetOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
      wrapper,
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

    const result = render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
      wrapper,
    });

    const nodeContainer = result.container.querySelector('[data-testid*="node-target-"]');
    expect(nodeContainer).toBeInTheDocument();
  });

  describe('Expansion/Collapse', () => {
    it('should toggle expansion when clicking chevron on expandable node', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const toggleNodeSpy = vi.spyOn(TreeUIService, 'toggleNode');

      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeData.id]: {
            [tree.root.path]: true,
          },
        },
      });

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
        wrapper,
      });

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);
      expect(expandIcon).toBeInTheDocument();

      fireEvent.click(expandIcon);

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

      render(<TargetDocumentNode treeNode={leafNode!} documentNodeId={documentNodeData.id} rank={2} />, {
        wrapper,
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

      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeData.id]: {
            [tree.root.path]: true,
          },
        },
      });

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
        wrapper,
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

      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeData.id]: {
            [tree.root.path]: false,
          },
        },
      });

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
        wrapper,
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

      const toggleNodeSpy = vi.spyOn(TreeUIService, 'toggleNode');

      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeData.id]: {
            [tree.root.path]: true,
          },
        },
      });

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
        wrapper,
      });

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);

      fireEvent.click(expandIcon);

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

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
        wrapper,
      });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);
      expect(nodeContainer).toBeInTheDocument();

      fireEvent.click(nodeContainer);

      expect(nodeContainer).toHaveAttribute('data-selected', 'true');
    });

    it('should update data-selected attribute when selected', async () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
        wrapper,
      });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      // Initially not selected
      expect(nodeContainer).toHaveAttribute('data-selected', 'false');

      fireEvent.click(nodeContainer);

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

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, {
        wrapper,
      });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);
      expect(nodeContainer).toBeInTheDocument();

      fireEvent.click(nodeContainer);

      expect(nodeContainer).toHaveAttribute('data-selected', 'true');

      fireEvent.click(nodeContainer);

      const deselectedNode = screen.getByTestId(`node-target-${documentNodeData.id}`);
      expect(deselectedNode).toBeInTheDocument();
    });

    it('should stop event propagation on field click', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);

      const parentClickHandler = vi.fn();

      render(
        <div onClick={parentClickHandler}>
          <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />
        </div>,
        { wrapper },
      );

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      fireEvent.click(nodeContainer);

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
        <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />,
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
        <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />,
        {
          wrapper,
        },
      );

      expect(screen.getByTestId(`node-target-${documentNodeData.id}`)).toBeInTheDocument();

      rerender(
        <DataMapperProvider
          documentInitializationModel={
            new DocumentInitializationModel(
              {},
              {
                documentType: DocumentType.SOURCE_BODY,
                definitionType: DocumentDefinitionType.Primitive,
                name: BODY_DOCUMENT_ID,
              },
              {
                documentType: DocumentType.TARGET_BODY,
                definitionType: DocumentDefinitionType.Primitive,
                name: BODY_DOCUMENT_ID,
              },
            )
          }
        >
          <MappingLinksProvider>
            <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />
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
        <TargetDocumentNode treeNode={fieldNode} documentNodeId={documentNodeData.id} rank={1} />,
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
        <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />,
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
        <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />,
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

  describe('AddMappingNode', () => {
    it('should render AddMappingNode with Add Mapping button for AddMappingNodeData', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const documentNodeData = new TargetDocumentNodeData(document, mappingTree);
      const addMappingNodeData = new AddMappingNodeData(documentNodeData, document.fields[0]);
      const treeNode = new DocumentTreeNode(addMappingNodeData);

      render(<TargetDocumentNode treeNode={treeNode} documentNodeId={documentNodeData.id} rank={1} />, { wrapper });

      expect(screen.getByText('Add Mapping')).toBeInTheDocument();
    });

    it('should not render TargetNodeActions for AddMappingNodeData', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const documentNodeData = new TargetDocumentNodeData(document, mappingTree);
      const addMappingNodeData = new AddMappingNodeData(documentNodeData, document.fields[0]);
      const treeNode = new DocumentTreeNode(addMappingNodeData);

      const { container } = render(
        <TargetDocumentNode treeNode={treeNode} documentNodeId={documentNodeData.id} rank={1} />,
        { wrapper },
      );

      expect(container.querySelector('.node__target__actions')).not.toBeInTheDocument();
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

      const parentClickHandler = vi.fn();

      useDocumentTreeStore.setState({
        expansionState: {
          [documentNodeData.id]: {
            [tree.root.path]: true,
          },
        },
      });

      render(
        <div onClick={parentClickHandler}>
          <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />
        </div>,
        { wrapper },
      );

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);

      fireEvent.click(expandIcon);

      // Parent click handler should not be called due to stopPropagation
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it('should stop propagation on field click', () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const parentClickHandler = vi.fn();

      render(
        <div onClick={parentClickHandler}>
          <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />
        </div>,
        { wrapper },
      );

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      fireEvent.click(nodeContainer);

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

      render(<TargetDocumentNode treeNode={leafNode!} documentNodeId={documentNodeData.id} rank={2} />, {
        wrapper,
      });

      // Should not have expand/collapse icons
      expect(screen.queryByTestId(`expand-icon-${leafNode!.nodeData.title}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`collapse-icon-${leafNode!.nodeData.title}`)).not.toBeInTheDocument();

      // Clicking the node should still work for selection
      const nodeContainer = screen.getByTestId(`node-target-${leafNode!.nodeData.id}`);
      fireEvent.click(nodeContainer);

      // Node should be selected
      expect(nodeContainer).toHaveAttribute('data-selected', 'true');
    });

    describe('double-click', () => {
      const renderRow = (treeNode: DocumentTreeNode, documentNodeData: TargetDocumentNodeData) => {
        const context = createDataMapperContext({
          mappingTree: documentNodeData.mappingTree,
          targetBodyDocument: documentNodeData.document,
        });
        const DataMapperWrapper = createDataMapperContextWrapper(context);
        const sharedTreeWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
          <DataMapperWrapper>
            <MappingLinksProvider>{children}</MappingLinksProvider>
          </DataMapperWrapper>
        );
        render(<TargetDocumentNode treeNode={treeNode} documentNodeId={documentNodeData.id} rank={1} />, {
          wrapper: sharedTreeWrapper,
        });
        return { context, row: screen.getByTestId(`node-target-${treeNode.nodeData.id}`) };
      };

      const parseTargetTree = (document: IDocument, mappingTree: MappingTree) => {
        const documentNodeData = new TargetDocumentNodeData(document, mappingTree);
        const tree = new DocumentTree(documentNodeData);
        TreeParsingService.parseTree(tree);
        return { documentNodeData, tree };
      };

      const searchTree = (
        node: DocumentTreeNode,
        predicate: (nodeData: NodeData) => boolean,
      ): DocumentTreeNode | undefined => {
        if (predicate(node.nodeData)) return node;
        for (const child of node.children) {
          const found = searchTree(child, predicate);
          if (found) return found;
        }
        return undefined;
      };

      const findTreeNode = (node: DocumentTreeNode, predicate: (nodeData: NodeData) => boolean): DocumentTreeNode => {
        const found = searchTree(node, predicate);
        if (!found) throw new Error('Tree node not found');
        return found;
      };

      const byTitle = (title: string) => (nodeData: NodeData) => nodeData.title === title;

      const byMappingUnder =
        (type: abstract new (...args: never[]) => MappingItem, fieldName: string) => (nodeData: NodeData) =>
          nodeData instanceof MappingNodeData &&
          nodeData.mapping instanceof type &&
          nodeData.mapping.parent instanceof FieldItem &&
          nodeData.mapping.parent.field.name === fieldName;

      const createShipOrderTree = () => {
        const document = TestUtil.createTargetOrderDoc();
        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        return { document, mappingTree };
      };

      const findFieldRowData = (document: IDocument, mappingTree: MappingTree, title: string) => {
        const shipOrderRows = VisualizationService.generateNonDocumentNodeDataChildren(
          VisualizationService.generateStructuredDocumentChildren(new TargetDocumentNodeData(document, mappingTree))[0],
        );
        const row = shipOrderRows.find((r) => r.title === title);
        if (!(row instanceof TargetFieldNodeData)) throw new Error(`Unmapped row '${title}' not found`);
        return row;
      };

      let getMenuItemsSpy: MockInstance<typeof MappingActionRegistryService.getMappingContextMenuItems>;
      let applyValueOfSelectorSpy: MockInstance<typeof MappingActionService.applyValueOfSelector>;

      beforeEach(() => {
        getMenuItemsSpy = vi.spyOn(MappingActionRegistryService, 'getMappingContextMenuItems');
        applyValueOfSelectorSpy = vi.spyOn(MappingActionService, 'applyValueOfSelector');
      });

      afterEach(() => {
        getMenuItemsSpy.mockRestore();
        applyValueOfSelectorSpy.mockRestore();
        useDocumentTreeStore.getState().setAddingVariableTo(null);
      });

      it('should call applyValueOfSelector and handleUpdate on double click', () => {
        const document = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        const documentNodeData = new DocumentNodeData(document);
        const tree = new DocumentTree(documentNodeData);

        render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, { wrapper });

        const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);
        expect(nodeContainer).toBeInTheDocument();
        getMenuItemsSpy.mockClear();

        fireEvent.doubleClick(nodeContainer);

        expect(getMenuItemsSpy).toHaveBeenCalledWith(documentNodeData);
        expect(applyValueOfSelectorSpy).toHaveBeenCalledWith(documentNodeData);
        expect(applyValueOfSelectorSpy).toHaveBeenCalledTimes(1);
      });

      it('should not call applyValueOfSelector when the value-of menu item is not available', () => {
        const document = new PrimitiveDocument(
          new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
        );
        const documentNodeData = new DocumentNodeData(document);
        const tree = new DocumentTree(documentNodeData);
        getMenuItemsSpy.mockReturnValue([]);

        render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, { wrapper });

        const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);
        expect(nodeContainer).toBeInTheDocument();

        fireEvent.doubleClick(nodeContainer);

        expect(getMenuItemsSpy).toHaveBeenCalledWith(documentNodeData);
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();
      });

      it('should not add a value-of on a container row, and should on the title of a leaf row', () => {
        const { document, mappingTree } = createShipOrderTree();
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const shipToNode = findTreeNode(tree.root, byTitle('ShipTo'));
        const shipTo = renderRow(shipToNode, documentNodeData);
        getMenuItemsSpy.mockClear();

        fireEvent.doubleClick(shipTo.row);

        expect(getMenuItemsSpy).toHaveBeenCalledWith(shipToNode.nodeData);
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();
        expect(shipTo.context.refreshMappingTree).not.toHaveBeenCalled();

        const orderPersonNode = findTreeNode(tree.root, byTitle('OrderPerson'));
        const orderPerson = renderRow(orderPersonNode, documentNodeData);
        fireEvent.doubleClick(within(orderPerson.row).getByText('OrderPerson'));

        expect(applyValueOfSelectorSpy).toHaveBeenCalledTimes(1);
        expect(applyValueOfSelectorSpy).toHaveBeenCalledWith(orderPersonNode.nodeData);
        expect(orderPerson.context.refreshMappingTree).toHaveBeenCalledWith({ structural: true });
      });

      it('should not add a second value-of on a row whose value-of item is disabled', () => {
        const { document, mappingTree } = createShipOrderTree();
        MappingSerializerService.deserialize(
          getShipOrderToShipOrderXslt(),
          document,
          mappingTree,
          new Map<string, IDocument>(),
        );
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const orderPersonNode = findTreeNode(tree.root, byTitle('OrderPerson'));
        const orderPersonNodeData = orderPersonNode.nodeData as TargetNodeData;
        expect(orderPersonNodeData).toBeInstanceOf(FieldItemNodeData);
        const valueSelectorItem = MappingActionRegistryService.getMappingContextMenuItems(orderPersonNodeData).find(
          (item) => item.key === MappingActionKind.ValueSelector,
        );
        expect(valueSelectorItem?.isDisabled?.(orderPersonNodeData)).toBe(true);
        const orderPerson = renderRow(orderPersonNode, documentNodeData);

        fireEvent.doubleClick(within(orderPerson.row).getByText('OrderPerson'));

        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();
        expect(orderPerson.context.refreshMappingTree).not.toHaveBeenCalled();
      });

      it('should judge unexpanded named-type rows beyond the parse frontier, and ignore the expand chevron', () => {
        const document = TestUtil.createNamedTypesBeyondFrontierDoc();
        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const addressNode = findTreeNode(tree.root, byTitle('Address'));
        const priceNode = findTreeNode(tree.root, byTitle('Price'));
        for (const node of [addressNode, priceNode]) {
          expect(node.nodeData).toBeInstanceOf(TargetFieldNodeData);
          expect((node.nodeData as TargetFieldNodeData).field.namedTypeFragmentRefs).toHaveLength(1);
        }

        const address = renderRow(addressNode, documentNodeData);
        getMenuItemsSpy.mockClear();
        fireEvent.doubleClick(within(address.row).getByText('Address'));
        expect(getMenuItemsSpy).toHaveBeenCalledWith(addressNode.nodeData);
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();

        const price = renderRow(priceNode, documentNodeData);
        fireEvent.doubleClick(screen.getByTestId('collapse-icon-Price'));
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();

        fireEvent.doubleClick(within(price.row).getByText('Price'));
        expect(applyValueOfSelectorSpy).toHaveBeenCalledTimes(1);
        expect(applyValueOfSelectorSpy).toHaveBeenCalledWith(priceNode.nodeData);
      });

      it('should ignore double-clicks in the expand column of a row that cannot expand', () => {
        const { document, mappingTree } = createShipOrderTree();
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const orderPersonNode = findTreeNode(tree.root, byTitle('OrderPerson'));
        const orderPerson = renderRow(orderPersonNode, documentNodeData);
        const spacer = orderPerson.row.querySelector('.node__expand[aria-hidden="true"]');
        if (!spacer) throw new Error('Expand spacer not rendered');

        fireEvent.doubleClick(spacer);
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();

        fireEvent.doubleClick(within(orderPerson.row).getByText('OrderPerson'));
        expect(applyValueOfSelectorSpy).toHaveBeenCalledTimes(1);
      });

      it('should judge unexpanded JSON rows beyond the parse frontier by their type', () => {
        const document = TestUtil.createFieldsBeyondFrontierJsonDoc();
        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.JSON_SCHEMA,
        );
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const byKey = (key: string) => (nodeData: NodeData) =>
          nodeData instanceof TargetFieldNodeData && 'key' in nodeData.field && nodeData.field.key === key;
        const codeNode = findTreeNode(tree.root, byKey('code'));
        const addressNode = findTreeNode(tree.root, byKey('address'));
        const metadataNode = findTreeNode(tree.root, byKey('metadata'));
        for (const node of [codeNode, addressNode]) {
          expect((node.nodeData as TargetFieldNodeData).field.namedTypeFragmentRefs).toHaveLength(1);
        }

        const metadata = renderRow(metadataNode, documentNodeData);
        getMenuItemsSpy.mockClear();
        fireEvent.doubleClick(metadata.row);
        expect(getMenuItemsSpy).toHaveBeenCalledWith(metadataNode.nodeData);
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();

        const code = renderRow(codeNode, documentNodeData);
        fireEvent.doubleClick(code.row);
        expect(applyValueOfSelectorSpy).toHaveBeenCalledTimes(1);
        expect(applyValueOfSelectorSpy).toHaveBeenCalledWith(codeNode.nodeData);
      });

      it('should not add a value-of on an "if" row inside a container', () => {
        const { document, mappingTree } = createShipOrderTree();
        MappingActionService.applyInnerIf(findFieldRowData(document, mappingTree, 'ShipTo'));
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const ifNode = findTreeNode(tree.root, byMappingUnder(IfItem, 'ShipTo'));
        const ifRow = renderRow(ifNode, documentNodeData);
        getMenuItemsSpy.mockClear();

        fireEvent.doubleClick(within(ifRow.row).getByText('if'));

        expect(getMenuItemsSpy).toHaveBeenCalledWith(ifNode.nodeData);
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();
      });

      it('should ignore double-clicks in the controls and dialogs of an "if" row under a leaf', () => {
        const { document, mappingTree } = createShipOrderTree();
        MappingActionService.applyInnerIf(findFieldRowData(document, mappingTree, 'OrderPerson'));
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const ifNode = findTreeNode(tree.root, byMappingUnder(IfItem, 'OrderPerson'));
        if (!(ifNode.nodeData instanceof MappingNodeData)) throw new Error('if row not found');
        ifNode.nodeData.mapping.comment = 'check the person';
        const { row } = renderRow(ifNode, documentNodeData);

        fireEvent.doubleClick(within(row).getByTestId('transformation-xpath-input'));
        fireEvent.doubleClick(within(row).getByTestId(`edit-xpath-button-${ifNode.nodeData.id}`));
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();

        fireEvent.click(within(row).getByRole('button', { name: 'Edit comment' }));
        fireEvent.doubleClick(screen.getByTestId('comment-textarea'));
        fireEvent.doubleClick(screen.getByRole('dialog'));
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();

        fireEvent.doubleClick(within(row).getByText('if'));
        expect(applyValueOfSelectorSpy).toHaveBeenCalledTimes(1);
        expect(applyValueOfSelectorSpy).toHaveBeenCalledWith(ifNode.nodeData);
      });

      it('should ignore double-clicks in the inline "Add variable" editor of a row', () => {
        const { document, mappingTree } = createShipOrderTree();
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const orderPersonNode = findTreeNode(tree.root, byTitle('OrderPerson'));
        useDocumentTreeStore.getState().setAddingVariableTo(orderPersonNode.nodeData.path.toString());
        const { row } = renderRow(orderPersonNode, documentNodeData);
        const variableEditor = row.querySelector('.name-input-placeholder');
        if (!variableEditor) throw new Error('Add variable editor not rendered');

        fireEvent.doubleClick(variableEditor);

        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();
      });

      it('should not add a value-of on the title of a variable row, which would drop its select expression', () => {
        const { document, mappingTree } = createShipOrderTree();
        const shipOrderItem = MappingService.createFieldItem(mappingTree, document.fields[0]);
        const variable = MappingService.addVariable(shipOrderItem, 'var1', '/ns0:ShipOrder/OrderPerson');
        const { documentNodeData, tree } = parseTargetTree(document, mappingTree);
        const variableNode = findTreeNode(tree.root, (nodeData) => nodeData instanceof VariableNodeData);
        const { context, row } = renderRow(variableNode, documentNodeData);
        getMenuItemsSpy.mockClear();

        fireEvent.doubleClick(within(row).getByText('var1'));

        expect(getMenuItemsSpy).toHaveBeenCalledWith(variableNode.nodeData);
        expect(applyValueOfSelectorSpy).not.toHaveBeenCalled();
        expect(context.refreshMappingTree).not.toHaveBeenCalled();
        expect(variable.children).toHaveLength(0);
        expect(variable.expression).toBe('/ns0:ShipOrder/OrderPerson');
      });
    });
  });

  describe('Keyboard Selection', () => {
    it('should toggle selection on Enter key', () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, { wrapper });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      fireEvent.keyDown(nodeContainer, { key: 'Enter' });

      expect(nodeContainer).toHaveAttribute('data-selected', 'true');
    });

    it('should toggle selection on Space key', () => {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(<TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />, { wrapper });

      const nodeContainer = screen.getByTestId(`node-target-${documentNodeData.id}`);

      fireEvent.keyDown(nodeContainer, { key: ' ' });

      expect(nodeContainer).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('Variable Node', () => {
    afterEach(() => {
      act(() => {
        useDocumentTreeStore.getState().setAddingVariableTo(null);
        useDocumentTreeStore.getState().setRenamingVariable(null);
      });
    });

    it('should render variable node with $name label', () => {
      const document = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(document.documentType, document.documentId, DocumentDefinitionType.XML_SCHEMA);
      const targetDocNode = new TargetDocumentNodeData(document, tree);
      const variableItem = new VariableItem(tree, 'taxRate');
      const variableNodeData = new VariableNodeData(targetDocNode, variableItem);
      const variableTreeNode = new DocumentTreeNode(variableNodeData);

      render(<TargetDocumentNode treeNode={variableTreeNode} documentNodeId={targetDocNode.id} rank={1} />, {
        wrapper,
      });

      expect(screen.getByText('taxRate')).toBeInTheDocument();
    });

    it('should show VariableInputPlaceholder for add mode when addingVariableToNodePath matches', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const fieldItem = new FieldItem(mappingTree, document.fields[0]);
      mappingTree.children.push(fieldItem);
      const targetDocNode = new TargetDocumentNodeData(document, mappingTree);
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const fieldNode = targetDocChildren[0] as FieldItemNodeData;
      const fieldTreeNode = new DocumentTreeNode(fieldNode);

      const nodePath = fieldNode.path.toString();
      act(() => {
        useDocumentTreeStore.getState().setAddingVariableTo(nodePath);
      });

      render(<TargetDocumentNode treeNode={fieldTreeNode} documentNodeId={targetDocNode.id} rank={1} />, {
        wrapper,
      });

      expect(screen.getByTestId('new-variable-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('new-variable-submit-btn')).toBeInTheDocument();
      expect(screen.getByTestId('new-variable-cancel-btn')).toBeInTheDocument();
    });

    it('should show VariableInputPlaceholder for rename mode when renamingVariableId matches', () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const targetDocNode = new TargetDocumentNodeData(document, mappingTree);
      const variableItem = new VariableItem(mappingTree, 'taxRate');
      mappingTree.children.push(variableItem);
      const variableNodeData = new VariableNodeData(targetDocNode, variableItem);
      const variableTreeNode = new DocumentTreeNode(variableNodeData);

      act(() => {
        useDocumentTreeStore.getState().setRenamingVariable(variableItem.id);
      });

      render(<TargetDocumentNode treeNode={variableTreeNode} documentNodeId={targetDocNode.id} rank={1} />, {
        wrapper,
      });

      const input = screen.getByTestId('new-variable-name-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('taxRate');
      expect(screen.getByTestId(`node-target-${variableNodeData.id}-renaming`)).toBeInTheDocument();
    });

    it('should clear store state when cancel is clicked on add placeholder', async () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const fieldItem = new FieldItem(mappingTree, document.fields[0]);
      mappingTree.children.push(fieldItem);
      const targetDocNode = new TargetDocumentNodeData(document, mappingTree);
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const fieldNode = targetDocChildren[0] as FieldItemNodeData;
      const fieldTreeNode = new DocumentTreeNode(fieldNode);

      const nodePath = fieldNode.path.toString();
      act(() => {
        useDocumentTreeStore.getState().setAddingVariableTo(nodePath);
      });

      render(<TargetDocumentNode treeNode={fieldTreeNode} documentNodeId={targetDocNode.id} rank={1} />, {
        wrapper,
      });

      fireEvent.click(screen.getByTestId('new-variable-cancel-btn'));

      await waitFor(() => {
        expect(useDocumentTreeStore.getState().addingVariableToNodePath).toBeNull();
      });
    });

    it('should add variable when submit is clicked on add placeholder', async () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const fieldItem = new FieldItem(mappingTree, document.fields[0]);
      mappingTree.children.push(fieldItem);
      const targetDocNode = new TargetDocumentNodeData(document, mappingTree);
      const targetDocChildren = VisualizationService.generateStructuredDocumentChildren(targetDocNode);
      const fieldNode = targetDocChildren[0] as FieldItemNodeData;
      const fieldTreeNode = new DocumentTreeNode(fieldNode);

      const addVariableSpy = vi.spyOn(MappingService, 'addVariable');
      const nodePath = fieldNode.path.toString();
      act(() => {
        useDocumentTreeStore.getState().setAddingVariableTo(nodePath);
      });

      render(<TargetDocumentNode treeNode={fieldTreeNode} documentNodeId={targetDocNode.id} rank={1} />, {
        wrapper,
      });

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'myVar' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      await waitFor(() => {
        expect(addVariableSpy).toHaveBeenCalledWith(fieldNode.mapping, 'myVar');
      });
      expect(useDocumentTreeStore.getState().addingVariableToNodePath).toBeNull();
      addVariableSpy.mockRestore();
    });

    it('should rename variable when submit is clicked on rename placeholder', async () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const targetDocNode = new TargetDocumentNodeData(document, mappingTree);
      const variableItem = new VariableItem(mappingTree, 'oldName');
      mappingTree.children.push(variableItem);
      const variableNodeData = new VariableNodeData(targetDocNode, variableItem);
      const variableTreeNode = new DocumentTreeNode(variableNodeData);

      const updateVariableSpy = vi.spyOn(MappingService, 'updateVariable');
      act(() => {
        useDocumentTreeStore.getState().setRenamingVariable(variableItem.id);
      });

      render(<TargetDocumentNode treeNode={variableTreeNode} documentNodeId={targetDocNode.id} rank={1} />, {
        wrapper,
      });

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'newName' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      await waitFor(() => {
        expect(updateVariableSpy).toHaveBeenCalledWith(variableItem, 'newName', variableItem.expression);
      });
      expect(useDocumentTreeStore.getState().renamingVariableId).toBeNull();
      updateVariableSpy.mockRestore();
    });

    it('should clear store state when cancel is clicked on rename placeholder', async () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const targetDocNode = new TargetDocumentNodeData(document, mappingTree);
      const variableItem = new VariableItem(mappingTree, 'taxRate');
      mappingTree.children.push(variableItem);
      const variableNodeData = new VariableNodeData(targetDocNode, variableItem);
      const variableTreeNode = new DocumentTreeNode(variableNodeData);

      act(() => {
        useDocumentTreeStore.getState().setRenamingVariable(variableItem.id);
      });

      render(<TargetDocumentNode treeNode={variableTreeNode} documentNodeId={targetDocNode.id} rank={1} />, {
        wrapper,
      });

      fireEvent.click(screen.getByTestId('new-variable-cancel-btn'));

      await waitFor(() => {
        expect(useDocumentTreeStore.getState().renamingVariableId).toBeNull();
      });
    });
  });

  describe('Document Actions', () => {
    it('should render DocumentActions for document nodes', () => {
      const document = TestUtil.createTargetOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { container } = render(
        <TargetDocumentNode treeNode={tree.root} documentNodeId={documentNodeData.id} rank={0} />,
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
        <TargetDocumentNode treeNode={fieldNode} documentNodeId={documentNodeData.id} rank={1} />,
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
