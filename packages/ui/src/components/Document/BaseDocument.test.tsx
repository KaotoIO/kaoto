import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { BODY_DOCUMENT_ID, DocumentType, PrimitiveDocument } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { TreeUIService } from '../../services/tree-ui.service';
import { useDocumentTreeStore } from '../../store';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { BaseDocument } from './BaseDocument';

describe('BaseDocument', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <DataMapperCanvasProvider>{children}</DataMapperCanvasProvider>
    </DataMapperProvider>
  );

  beforeEach(() => {
    act(() => {
      useDocumentTreeStore.setState({ expansionState: {} });
    });
  });

  describe('Basic Rendering', () => {
    it('should render document with header', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(
        <BaseDocument
          header={<div data-testid="custom-header">Custom Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    });

    it('should render with document__container class', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const { container } = render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      expect(container.querySelector('.document__container')).toBeInTheDocument();
    });

    it('should throw error if treeNode is not a document node', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = TreeUIService.createTree(documentNodeData);
      const fieldNode = tree.root.children[0]; // Get a field, not a document

      // Temporarily suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <BaseDocument
            header={<div>Header</div>}
            treeNode={fieldNode}
            documentId={documentNodeData.id}
            isReadOnly={false}
          />,
          { wrapper },
        );
      }).toThrow('BaseDocument requires a document node');

      console.error = originalError;
    });
  });

  describe('Document Actions', () => {
    it('should render Attach and Detach schema buttons when not read-only', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      // Use semantic queries - find buttons by their aria-label
      expect(screen.getByLabelText('Attach schema')).toBeInTheDocument();
      expect(screen.getByLabelText('Detach schema')).toBeInTheDocument();
    });

    it('should not render Attach and Detach schema buttons when read-only', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={true}
        />,
        { wrapper },
      );

      expect(screen.queryByLabelText('Attach schema')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Detach schema')).not.toBeInTheDocument();
    });

    it('should render additional actions when provided', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      const additionalActions = [
        <div key="action1" data-testid="additional-action-1">
          Action 1
        </div>,
        <div key="action2" data-testid="additional-action-2">
          Action 2
        </div>,
      ];

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
          additionalActions={additionalActions}
        />,
        { wrapper },
      );

      expect(screen.getByTestId('additional-action-1')).toBeInTheDocument();
      expect(screen.getByTestId('additional-action-2')).toBeInTheDocument();
    });

    it('should stop event propagation when clicking on actions', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      const parentClickHandler = jest.fn();

      const { container } = render(
        <div onClick={parentClickHandler}>
          <BaseDocument
            header={<div>Header</div>}
            treeNode={tree.root}
            documentId={documentNodeData.id}
            isReadOnly={false}
          />
        </div>,
        { wrapper },
      );

      const actionsGroup = container.querySelector('.document__actions');
      expect(actionsGroup).toBeInTheDocument();

      act(() => {
        fireEvent.click(actionsGroup!);
      });

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Expansion/Collapse', () => {
    it('should show expand icon when document has children', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = TreeUIService.createTree(documentNodeData);

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
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      expect(screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`)).toBeInTheDocument();
    });

    it('should not show expand icon when document has no children', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      expect(screen.queryByTestId(`expand-icon-${tree.root.nodeData.title}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`collapse-icon-${tree.root.nodeData.title}`)).not.toBeInTheDocument();
    });

    it('should call TreeUIService.toggleNode when expand icon is clicked', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = TreeUIService.createTree(documentNodeData);
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

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      const expandIcon = screen.getByTestId(`expand-icon-${tree.root.nodeData.title}`);

      act(() => {
        fireEvent.click(expandIcon);
      });

      expect(toggleNodeSpy).toHaveBeenCalledWith(documentNodeData.id, tree.root.path);

      toggleNodeSpy.mockRestore();
    });

    it('should show ChevronRight when collapsed', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = TreeUIService.createTree(documentNodeData);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: false,
            },
          },
        });
      });

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      expect(screen.getByTestId(`collapse-icon-${tree.root.nodeData.title}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`expand-icon-${tree.root.nodeData.title}`)).not.toBeInTheDocument();
    });
  });

  describe('Children Rendering', () => {
    it('should render children using renderNodes function when expanded', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = TreeUIService.createTree(documentNodeData);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      const renderNodes = jest.fn((childNode) => (
        <div key={childNode.path} data-testid={`child-${childNode.path}`}>
          Child Node
        </div>
      ));

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
          renderNodes={renderNodes}
        />,
        { wrapper },
      );

      // Verify renderNodes was called for children
      expect(renderNodes).toHaveBeenCalled();
      expect(renderNodes.mock.calls.length).toBeGreaterThan(0);

      // Verify all children are rendered
      for (const child of tree.root.children) {
        expect(screen.getByTestId(`child-${child.path}`)).toBeInTheDocument();
      }
    });

    it('should not render children when collapsed', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = TreeUIService.createTree(documentNodeData);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: false,
            },
          },
        });
      });

      const renderNodes = jest.fn((childNode) => <div data-testid={`child-${childNode.path}`}>Child Node</div>);

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
          renderNodes={renderNodes}
        />,
        { wrapper },
      );

      expect(renderNodes).not.toHaveBeenCalled();
    });

    it('should pass isReadOnly to renderNodes function', () => {
      const document = TestUtil.createSourceOrderDoc();
      const documentNodeData = new DocumentNodeData(document);
      const tree = TreeUIService.createTree(documentNodeData);

      act(() => {
        useDocumentTreeStore.setState({
          expansionState: {
            [documentNodeData.id]: {
              [tree.root.path]: true,
            },
          },
        });
      });

      const renderNodes = jest.fn((childNode, isReadOnly) => (
        <div data-testid={`child-${childNode.path}-readonly-${isReadOnly}`}>Child Node</div>
      ));

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={true}
          renderNodes={renderNodes}
        />,
        { wrapper },
      );

      for (let index = 0; index < tree.root.children.length; index++) {
        const child = tree.root.children[index];
        expect(renderNodes).toHaveBeenNthCalledWith(index + 1, child, true);
      }
    });
  });

  describe('Selection', () => {
    it('should render document container with stable test-id', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      expect(screen.getByTestId(`document-${documentNodeData.id}`)).toBeInTheDocument();
    });

    it('should toggle selection when clicked', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      const documentContainer = screen.getByTestId(`document-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(documentContainer);
      });

      // After first click, should be selected (data-selected="true")
      expect(documentContainer).toHaveAttribute('data-selected', 'true');

      act(() => {
        fireEvent.click(documentContainer);
      });

      // After second click, should be deselected (data-selected="false")
      expect(documentContainer).toHaveAttribute('data-selected', 'false');
    });

    it('should apply data-selected attribute when selected', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);

      render(
        <BaseDocument
          header={<div>Header</div>}
          treeNode={tree.root}
          documentId={documentNodeData.id}
          isReadOnly={false}
        />,
        { wrapper },
      );

      const documentContainer = screen.getByTestId(`document-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(documentContainer);
      });

      expect(documentContainer).toHaveAttribute('data-selected', 'true');
    });

    it('should stop event propagation on document click', () => {
      const document = new PrimitiveDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      const parentClickHandler = jest.fn();

      render(
        <div onClick={parentClickHandler}>
          <BaseDocument
            header={<div>Header</div>}
            treeNode={tree.root}
            documentId={documentNodeData.id}
            isReadOnly={false}
          />
        </div>,
        { wrapper },
      );

      const documentContainer = screen.getByTestId(`document-${documentNodeData.id}`);

      act(() => {
        fireEvent.click(documentContainer);
      });

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });
});
