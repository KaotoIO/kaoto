import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentTree } from '../../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { TreeParsingService } from '../../../services/visualization/tree-parsing.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { SourceDocumentNodeWithContextMenu } from '../SourceDocumentNode';

describe('withFieldContextMenu', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperProvider>
  );

  const createFieldNode = () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    return { documentNodeData, fieldNode: tree.root.children[0] };
  };

  it('should open context menu on right-click for field nodes', () => {
    const { documentNodeData, fieldNode } = createFieldNode();

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={fieldNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${fieldNode.nodeData.id}`));
    });

    expect(screen.getByText('Override Field...')).toBeInTheDocument();
  });

  it('should not open context menu in read-only mode', () => {
    const { documentNodeData, fieldNode } = createFieldNode();

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={fieldNode}
        documentId={documentNodeData.id}
        isReadOnly={true}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${fieldNode.nodeData.id}`));
    });

    expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
  });

  it('should not open context menu for document nodes', () => {
    const document = TestUtil.createSourceOrderDoc();
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={tree.root}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={0}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${documentNodeData.id}`));
    });

    expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
  });

  it('should close context menu when clicking outside', () => {
    const { documentNodeData, fieldNode } = createFieldNode();

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={fieldNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${fieldNode.nodeData.id}`));
    });

    expect(screen.getByText('Override Field...')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseDown(globalThis.document.body);
    });

    expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
  });

  it('should close context menu when pressing Escape', () => {
    const { documentNodeData, fieldNode } = createFieldNode();

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={fieldNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${fieldNode.nodeData.id}`));
    });

    expect(screen.getByText('Override Field...')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(globalThis.document, { key: 'Escape' });
    });

    expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
  });
});
