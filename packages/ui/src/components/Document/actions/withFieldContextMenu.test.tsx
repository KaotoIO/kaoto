import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { DocumentTree } from '../../../models/datamapper/document-tree';
import { FieldOverrideVariant, Types } from '../../../models/datamapper/types';
import { AbstractFieldNodeData, DocumentNodeData, FieldNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { ChoiceSelectionService } from '../../../services/document/choice-selection.service';
import { FieldOverrideService } from '../../../services/document/field-override.service';
import { XmlSchemaDocumentService } from '../../../services/document/xml-schema/xml-schema-document.service';
import { TreeParsingService } from '../../../services/visualization/tree-parsing.service';
import { getFieldSubstitutionXsd, TestUtil } from '../../../stubs/datamapper/data-mapper';
import { QName } from '../../../xml-schema-ts/QName';
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

  it('should open Field Override Modal when clicking Override Field menu item', () => {
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
      fireEvent.click(screen.getByText('Override Field...'));
    });

    expect(screen.getByText(/Field Override:/)).toBeInTheDocument();
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

    expect(screen.getByText('Override Field...')).toBeInTheDocument();
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

    const revertSpy = jest.spyOn(FieldOverrideService, 'revertFieldTypeOverride');

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

    const applySpy = jest.spyOn(FieldOverrideService, 'applyFieldTypeOverride');
    const mockCandidates = {
      'xs:int': {
        typeQName: new QName('http://www.w3.org/2001/XMLSchema', 'int'),
        displayName: 'int',
        description: 'Integer type',
        type: Types.Integer,
        isBuiltIn: true,
      },
    };
    const getSafeSpy = jest.spyOn(FieldOverrideService, 'getSafeOverrideCandidates').mockReturnValue(mockCandidates);

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
      fireEvent.click(screen.getByText('Override Field...'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Field Override:/)).toBeInTheDocument();
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
      fireEvent.click(screen.getByText('Override Field...'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Field Override:/)).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    await waitFor(() => {
      expect(screen.queryByText(/Field Override:/)).not.toBeInTheDocument();
    });
  });

  describe('abstract field substitution', () => {
    const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

    const createAbstractFieldNode = (selectCandidate = true) => {
      const definition = new DocumentDefinition(
        DocumentType.SOURCE_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        'test-doc',
        { 'FieldSubstitution.xsd': getFieldSubstitutionXsd() },
      );
      definition.rootElementChoice = { namespaceUri: NS_SUBSTITUTION, name: 'Zoo' };
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      if (result.validationStatus !== 'success' || !result.document) {
        throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create document');
      }
      const document = result.document;
      const abstractAnimalField = document.fields[0].fields.find((f) => f.wrapperKind === 'abstract')!;
      if (selectCandidate) {
        const catIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Cat');
        abstractAnimalField.selectedMemberIndex = catIndex;
      }

      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const zooNode = tree.root.children[0];
      const abstractNode = zooNode.children.find((c) => c.nodeData instanceof AbstractFieldNodeData)!;
      return { document, documentNodeData, abstractNode, abstractAnimalField };
    };

    it('should show Reset Override for a selected abstract field substitution', () => {
      const { documentNodeData, abstractNode } = createAbstractFieldNode();
      expect(abstractNode.nodeData).toBeInstanceOf(AbstractFieldNodeData);
      expect((abstractNode.nodeData as AbstractFieldNodeData).abstractField).toBeDefined();

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={abstractNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      act(() => {
        fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
      });

      expect(screen.getByText('Override Field...')).toBeInTheDocument();
      expect(screen.getByText('Reset Override')).toBeInTheDocument();
    });

    it('should not show Reset Override for an unselected abstract field', () => {
      const { documentNodeData, abstractNode } = createAbstractFieldNode(false);

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={abstractNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      act(() => {
        fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
      });

      expect(screen.getByText('Override Field...')).toBeInTheDocument();
      expect(screen.queryByText('Reset Override')).not.toBeInTheDocument();
    });

    it('should call revertFieldSubstitution when clicking Reset Override on a selected abstract field', () => {
      const { documentNodeData, abstractNode, abstractAnimalField } = createAbstractFieldNode();

      const revertSpy = jest.spyOn(FieldOverrideService, 'revertFieldSubstitution');

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={abstractNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      act(() => {
        fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
      });

      act(() => {
        fireEvent.click(screen.getByText('Reset Override'));
      });

      expect(revertSpy).toHaveBeenCalledWith(abstractAnimalField, expect.any(Object));
      revertSpy.mockRestore();
    });
  });

  describe('Choice field context menu', () => {
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
      // "Show All Choice Options" should not appear when no member is selected (nothing to clear)
      expect(screen.queryByText('Show All Choice Options')).not.toBeInTheDocument();
      expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
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
      // No member is selected, so "Show All Choice Options" should not appear
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
});
