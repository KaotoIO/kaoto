import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentTree } from '../../../../models/datamapper/document-tree';
import { FieldOverrideVariant, Types } from '../../../../models/datamapper/types';
import { DocumentNodeData, FieldNodeData } from '../../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { FieldTypeOverrideService } from '../../../../services/field-type-override.service';
import { TreeParsingService } from '../../../../services/tree-parsing.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { QName } from '../../../../xml-schema-ts/QName';
import { SourceDocumentNodeWithContextMenu } from '../../SourceDocumentNode';

describe('withFieldOverrideContextMenu', () => {
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
    return { document, documentNodeData, fieldNode: tree.root.children[0] };
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

    expect(screen.getByText('Override Type...')).toBeInTheDocument();
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

    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
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

    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
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

    expect(screen.getByText('Override Type...')).toBeInTheDocument();

    act(() => {
      fireEvent.mouseDown(globalThis.document.body);
    });

    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
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

    expect(screen.getByText('Override Type...')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(globalThis.document, { key: 'Escape' });
    });

    expect(screen.queryByText('Override Type...')).not.toBeInTheDocument();
  });

  it('should open Type Override Modal when clicking Override Type menu item', () => {
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

    act(() => {
      fireEvent.click(screen.getByText('Override Type...'));
    });

    expect(screen.getByText(/Type Override:/)).toBeInTheDocument();
  });

  it('should show Reset Override menu item when field has type override', () => {
    const { documentNodeData, fieldNode } = createFieldNode();
    const field = (fieldNode.nodeData as FieldNodeData).field;
    field.typeOverride = FieldOverrideVariant.SAFE;
    field.originalField = {
      name: field.name,
      displayName: field.displayName,
      namespaceURI: field.namespaceURI,
      namespacePrefix: field.namespacePrefix,
      type: Types.String,
      typeQName: null,
      namedTypeFragmentRefs: [],
    };

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

    expect(screen.getByText('Override Type...')).toBeInTheDocument();
    expect(screen.getByText('Reset Override')).toBeInTheDocument();
  });

  it('should call revertFieldTypeOverride when clicking Reset Override', () => {
    const { documentNodeData, fieldNode } = createFieldNode();
    const field = (fieldNode.nodeData as FieldNodeData).field;
    field.typeOverride = FieldOverrideVariant.SAFE;
    field.originalField = {
      name: field.name,
      displayName: field.displayName,
      namespaceURI: field.namespaceURI,
      namespacePrefix: field.namespacePrefix,
      type: Types.String,
      typeQName: null,
      namedTypeFragmentRefs: [],
    };

    const revertSpy = jest.spyOn(FieldTypeOverrideService, 'revertFieldTypeOverride');

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

    act(() => {
      fireEvent.click(screen.getByText('Reset Override'));
    });

    expect(revertSpy).toHaveBeenCalledWith(field, expect.any(Object));
    revertSpy.mockRestore();
  });

  it('should call applyFieldTypeOverride when saving type override', async () => {
    const { documentNodeData, fieldNode } = createFieldNode();

    const applySpy = jest.spyOn(FieldTypeOverrideService, 'applyFieldTypeOverride');
    const mockCandidates = {
      'xs:int': {
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'int'),
        displayName: 'int',
        description: 'Integer type',
        type: Types.Integer,
        isBuiltIn: true,
      },
    };
    const getSafeSpy = jest
      .spyOn(FieldTypeOverrideService, 'getSafeOverrideCandidates')
      .mockReturnValue(mockCandidates);

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

    act(() => {
      fireEvent.click(screen.getByText('Override Type...'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Type Override:/)).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Select a new type...' }));
    });

    const intOption = screen.getAllByText('int').find((el) => el.closest('[role="option"]'));
    if (!intOption) throw new Error('Int option not found');

    act(() => {
      fireEvent.click(intOption);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save' })).not.toBeDisabled();
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });

    const field = (fieldNode.nodeData as FieldNodeData).field;
    expect(applySpy).toHaveBeenCalledWith(
      field,
      mockCandidates['xs:int'],
      expect.any(Object),
      FieldOverrideVariant.SAFE,
    );

    applySpy.mockRestore();
    getSafeSpy.mockRestore();
  });

  it('should close modal when Cancel button is clicked', async () => {
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

    act(() => {
      fireEvent.click(screen.getByText('Override Type...'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Type Override:/)).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Type Override:/)).not.toBeInTheDocument();
    });
  });
});
