import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentTree } from '../../../../models/datamapper/document-tree';
import { Types } from '../../../../models/datamapper/types';
import { DocumentNodeData } from '../../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { ChoiceSelectionService } from '../../../../services/document/choice-selection.service';
import { TreeParsingService } from '../../../../services/visualization/tree-parsing.service';
import { TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { SourceDocumentNodeWithContextMenu } from '../../SourceDocumentNode';

describe('useChoiceContextMenu', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperProvider>
  );

  const createChoiceFieldNode = (selectMember = false) => {
    const document = TestUtil.createSourceOrderDoc();
    const parentField = document.fields[0];
    const choiceField = {
      name: 'contactChoice',
      displayName: 'Contact Choice',
      type: Types.Container,
      wrapperKind: 'choice' as const,
      namedTypeFragmentRefs: [],
      parent: parentField,
      ownerDocument: document,
      fields: [] as Record<string, unknown>[],
      selectedMemberIndex: selectMember ? 1 : undefined,
    };
    const members = [
      {
        name: 'email',
        displayName: 'Email',
        type: Types.String,
        fields: [],
        namedTypeFragmentRefs: [],
        parent: choiceField,
        ownerDocument: document,
      },
      {
        name: 'phone',
        displayName: 'Phone',
        type: Types.String,
        fields: [],
        namedTypeFragmentRefs: [],
        parent: choiceField,
        ownerDocument: document,
      },
      {
        name: 'fax',
        displayName: 'Fax',
        type: Types.String,
        fields: [],
        namedTypeFragmentRefs: [],
        parent: choiceField,
        ownerDocument: document,
      },
    ];
    choiceField.fields = members;
    parentField.fields.push(choiceField as never);

    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const orderNode = tree.root.children[0];
    const lastChild = orderNode.children.length - 1;
    const choiceNode = orderNode.children[lastChild];
    return { document, documentNodeData, choiceNode, choiceField };
  };

  const createLargeChoiceFieldNode = (size = 11) => {
    const document = TestUtil.createSourceOrderDoc();
    const parentField = document.fields[0];
    const choiceField = {
      name: 'largeChoice',
      displayName: 'Large Choice',
      type: Types.Container,
      wrapperKind: 'choice' as const,
      namedTypeFragmentRefs: [],
      parent: parentField,
      ownerDocument: document,
      fields: [] as Record<string, unknown>[],
      selectedMemberIndex: undefined,
    };
    const members = Array.from({ length: size }, (_, i) => ({
      name: `member${i}`,
      displayName: `Member ${i}`,
      type: Types.String,
      fields: [],
      namedTypeFragmentRefs: [],
      parent: choiceField,
      ownerDocument: document,
    }));
    choiceField.fields = members;
    parentField.fields.push(choiceField as never);

    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const orderNode = tree.root.children[0];
    const lastChild = orderNode.children.length - 1;
    const choiceNode = orderNode.children[lastChild];
    return { documentNodeData, choiceNode };
  };

  it('should show choice members inline for unselected choice wrapper (Case A)', () => {
    const { documentNodeData, choiceNode } = createChoiceFieldNode(false);

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Fax')).toBeInTheDocument();
    expect(screen.queryByText('Show All Choice Options')).not.toBeInTheDocument();
  });

  it('should show Show All Choice Options and Override for selected choice (Case B)', () => {
    const { documentNodeData, choiceNode } = createChoiceFieldNode(true);

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    expect(screen.getByText('Show All Choice Options')).toBeInTheDocument();
    expect(screen.getByText('Override Field...')).toBeInTheDocument();
  });

  it('should call setChoiceSelection when clicking a choice member', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);

    const setSpy = jest.spyOn(ChoiceSelectionService, 'setChoiceSelection');

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    act(() => {
      fireEvent.click(screen.getByText('Phone'));
    });

    expect(setSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, 1, expect.any(Object));
    setSpy.mockRestore();
  });

  it('should call clearChoiceSelection when clicking Show All Choice Options', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);
    choiceField.selectedMemberIndex = 1;

    const clearSpy = jest.spyOn(ChoiceSelectionService, 'clearChoiceSelection');

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    act(() => {
      fireEvent.click(screen.getByText('Show All Choice Options'));
    });

    expect(clearSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, expect.any(Object));
    clearSpy.mockRestore();
  });

  it('should show Select Member... for choice with more than 10 members (Case A modal)', () => {
    const { documentNodeData, choiceNode } = createLargeChoiceFieldNode();

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    expect(screen.getByText('Select Member...')).toBeInTheDocument();
    expect(screen.queryByText('Member 0')).not.toBeInTheDocument();
    expect(screen.queryByText('Show All Choice Options')).not.toBeInTheDocument();
  });

  it('should open ChoiceSelectionModal when clicking Select Member...', () => {
    const { documentNodeData, choiceNode } = createLargeChoiceFieldNode();

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    act(() => {
      fireEvent.click(screen.getByText('Select Member...'));
    });

    expect(screen.getByText('Choice: Large Choice')).toBeInTheDocument();
  });

  it('should show empty menu for choice wrapper with no members and no selection', () => {
    const document = TestUtil.createSourceOrderDoc();
    const parentField = document.fields[0];
    const choiceField = {
      name: 'emptyChoice',
      displayName: 'Empty Choice',
      type: Types.Container,
      wrapperKind: 'choice' as const,
      namedTypeFragmentRefs: [],
      parent: parentField,
      ownerDocument: document,
      fields: [],
      selectedMemberIndex: undefined,
    };
    parentField.fields.push(choiceField as never);

    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const orderNode = tree.root.children[0];
    const lastChild = orderNode.children.length - 1;
    const choiceNode = orderNode.children[lastChild];

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    expect(screen.queryByText('Show All Choice Options')).not.toBeInTheDocument();
    expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
  });

  it('should close ChoiceSelectionModal when Cancel is clicked', () => {
    const { documentNodeData, choiceNode } = createLargeChoiceFieldNode();

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));
    });

    act(() => {
      fireEvent.click(screen.getByText('Select Member...'));
    });

    expect(screen.getByText('Choice: Large Choice')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    expect(screen.queryByText('Choice: Large Choice')).not.toBeInTheDocument();
  });

  it('should show Select action for choice member child (Case C)', () => {
    const { documentNodeData, choiceNode } = createChoiceFieldNode(false);
    const memberNode = choiceNode.children[0];

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={memberNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${memberNode.nodeData.id}`));
    });

    expect(screen.getByText("Select 'Email' in '(Email | Phone | Fax)'")).toBeInTheDocument();
    expect(screen.getByText('Override Field...')).toBeInTheDocument();
  });

  it('should call setChoiceSelection when clicking Select action on choice member (Case C)', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);
    const memberNode = choiceNode.children[1];

    const setSpy = jest.spyOn(ChoiceSelectionService, 'setChoiceSelection').mockImplementation(jest.fn());

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={memberNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${memberNode.nodeData.id}`));
    });

    act(() => {
      fireEvent.click(screen.getByText(/Select 'Phone'/));
    });

    expect(setSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, 1, expect.any(Object));
    setSpy.mockRestore();
  });
});

// Made with Bob
