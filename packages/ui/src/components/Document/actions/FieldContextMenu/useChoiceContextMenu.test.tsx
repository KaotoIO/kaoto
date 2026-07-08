import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper/document';
import { DocumentTree } from '../../../../models/datamapper/document-tree';
import { FieldItem, MappingTree } from '../../../../models/datamapper/mapping';
import { Types } from '../../../../models/datamapper/types';
import {
  DocumentNodeData,
  FieldNodeData,
  TargetChoiceFieldNodeData,
  TargetDocumentNodeData,
} from '../../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { ChoiceSelectionService } from '../../../../services/document/choice-selection.service';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { XmlSchemaField } from '../../../../services/document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../../../../services/document/xml-schema/xml-schema-document.service';
import { TreeParsingService } from '../../../../services/visualization/tree-parsing.service';
import { VisualizationService } from '../../../../services/visualization/visualization.service';
import { getChoiceWithAbstractXsd, TestUtil } from '../../../../stubs/datamapper/data-mapper';
import { SourceDocumentNodeWithContextMenu } from '../../SourceDocumentNode';
import { TargetDocumentNodeWithContextMenu } from '../../TargetDocumentNode';

describe('useChoiceContextMenu', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperProvider>
  );

  const createChoiceFieldNode = (selectMember = false) => {
    const document = TestUtil.createSourceOrderDoc();
    const parentField = document.fields[0];
    const choiceField = new XmlSchemaField(parentField, 'contactChoice', false);
    choiceField.displayName = 'Contact Choice';
    choiceField.type = Types.Container;
    choiceField.wrapperKind = 'choice';
    choiceField.selectedMemberIndex = selectMember ? 1 : undefined;

    const emailField = new XmlSchemaField(choiceField, 'email', false);
    emailField.displayName = 'Email';
    emailField.type = Types.String;

    const phoneField = new XmlSchemaField(choiceField, 'phone', false);
    phoneField.displayName = 'Phone';
    phoneField.type = Types.String;

    const faxField = new XmlSchemaField(choiceField, 'fax', false);
    faxField.displayName = 'Fax';
    faxField.type = Types.String;

    choiceField.fields = [emailField, phoneField, faxField];
    parentField.fields.push(choiceField);

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
    const choiceField = new XmlSchemaField(parentField, 'largeChoice', false);
    choiceField.displayName = 'Large Choice';
    choiceField.type = Types.Container;
    choiceField.wrapperKind = 'choice';
    choiceField.selectedMemberIndex = undefined;

    const members = Array.from({ length: size }, (_, i) => {
      const member = new XmlSchemaField(choiceField, `member${i}`, false);
      member.displayName = `Member ${i}`;
      member.type = Types.String;
      return member;
    });
    choiceField.fields = members;
    parentField.fields.push(choiceField);

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
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();
  });

  it('should show Clear selection and Override for selected choice (Case B)', () => {
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

    expect(screen.getByText('Clear selection')).toBeInTheDocument();
    expect(screen.getByText('Override Field...')).toBeInTheDocument();
  });

  it('should call setChoiceSelection when clicking a choice member', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);

    const setSpy = vi.spyOn(ChoiceSelectionService, 'setChoiceSelection');

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

  it('should call clearChoiceSelection when clicking Clear selection', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);
    choiceField.selectedMemberIndex = 1;

    const clearSpy = vi.spyOn(ChoiceSelectionService, 'clearChoiceSelection');

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
      fireEvent.click(screen.getByText('Clear selection'));
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
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();
  });

  it('should open choice selection modal when clicking Select Member...', () => {
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

    expect(screen.getByText('Select member for Large Choice')).toBeInTheDocument();
  });

  it('should show empty menu for choice wrapper with no members and no selection', () => {
    const document = TestUtil.createSourceOrderDoc();
    const parentField = document.fields[0];
    const choiceField = new XmlSchemaField(parentField, 'emptyChoice', false);
    choiceField.displayName = 'Empty Choice';
    choiceField.type = Types.Container;
    choiceField.wrapperKind = 'choice';
    choiceField.selectedMemberIndex = undefined;
    parentField.fields.push(choiceField);

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

    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();
    expect(screen.queryByText('Override Field...')).not.toBeInTheDocument();
  });

  it('should close choice selection modal when Cancel is clicked', () => {
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

    expect(screen.getByText('Select member for Large Choice')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    expect(screen.queryByText('Select member for Large Choice')).not.toBeInTheDocument();
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

    const setSpy = vi.spyOn(ChoiceSelectionService, 'setChoiceSelection').mockImplementation(vi.fn());

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

  describe('nested choice wrapper', () => {
    const createNestedChoiceFieldNode = (selectInner = false) => {
      const document = TestUtil.createSourceOrderDoc();
      const parentField = document.fields[0];
      const outerChoiceField = new XmlSchemaField(parentField, 'outerChoice', false);
      outerChoiceField.displayName = 'Outer Choice';
      outerChoiceField.type = Types.Container;
      outerChoiceField.wrapperKind = 'choice';
      outerChoiceField.selectedMemberIndex = 0;

      const innerChoiceField = new XmlSchemaField(outerChoiceField, 'innerChoice', false);
      innerChoiceField.displayName = 'Inner Choice';
      innerChoiceField.type = Types.Container;
      innerChoiceField.wrapperKind = 'choice';
      innerChoiceField.selectedMemberIndex = selectInner ? 0 : undefined;

      const innerAField = new XmlSchemaField(innerChoiceField, 'innerA', false);
      innerAField.displayName = 'InnerA';
      innerAField.type = Types.String;

      const innerBField = new XmlSchemaField(innerChoiceField, 'innerB', false);
      innerBField.displayName = 'InnerB';
      innerBField.type = Types.String;

      const innerCField = new XmlSchemaField(innerChoiceField, 'innerC', false);
      innerCField.displayName = 'InnerC';
      innerCField.type = Types.String;

      innerChoiceField.fields = [innerAField, innerBField, innerCField];

      const plainMember = new XmlSchemaField(outerChoiceField, 'plain', false);
      plainMember.displayName = 'Plain';
      plainMember.type = Types.String;

      outerChoiceField.fields = [innerChoiceField, plainMember];
      parentField.fields.push(outerChoiceField);

      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const orderNode = tree.root.children[0];
      const lastChild = orderNode.children.length - 1;
      const choiceNode = orderNode.children[lastChild];
      return { document, documentNodeData, choiceNode, outerChoiceField, innerChoiceField };
    };

    it('should show inner choice members and Clear selection for nested choice', () => {
      const { documentNodeData, choiceNode } = createNestedChoiceFieldNode();

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

      expect(screen.getByText('InnerA')).toBeInTheDocument();
      expect(screen.getByText('InnerB')).toBeInTheDocument();
      expect(screen.getByText('InnerC')).toBeInTheDocument();
      expect(screen.getByText('Clear selection')).toBeInTheDocument();
    });

    it('should call setChoiceSelection on inner wrapper when clicking an inner member', () => {
      const { documentNodeData, choiceNode, innerChoiceField } = createNestedChoiceFieldNode();

      const setSpy = vi.spyOn(ChoiceSelectionService, 'setChoiceSelection').mockImplementation(vi.fn());

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
        fireEvent.click(screen.getByText('InnerB'));
      });

      expect(setSpy).toHaveBeenCalledWith(expect.any(Object), innerChoiceField, 1, expect.any(Object));
      setSpy.mockRestore();
    });

    it('should call clearChoiceSelection on outer wrapper when clicking Clear selection', () => {
      const { documentNodeData, choiceNode, outerChoiceField } = createNestedChoiceFieldNode();

      const clearSpy = vi.spyOn(ChoiceSelectionService, 'clearChoiceSelection').mockImplementation(vi.fn());

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
        fireEvent.click(screen.getByText('Clear selection'));
      });

      expect(clearSpy).toHaveBeenCalledWith(expect.any(Object), outerChoiceField, expect.any(Object));
      clearSpy.mockRestore();
    });

    it('should not show Select self action when choice member is already selected', () => {
      const { documentNodeData, choiceNode } = createNestedChoiceFieldNode();

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

      expect(screen.queryByText(/Select '.*' in '.*'/)).not.toBeInTheDocument();
    });
  });

  describe('target-side choice wrapper', () => {
    const createTargetChoiceFieldNode = () => {
      const document = TestUtil.createTargetOrderDoc();
      const mappingTree = new MappingTree(
        document.documentType,
        document.documentId,
        DocumentDefinitionType.XML_SCHEMA,
      );
      const documentNodeData = new TargetDocumentNodeData(document, mappingTree);
      const parentField = document.fields[0];

      const choiceField = new XmlSchemaField(parentField, 'contactChoice', false);
      choiceField.displayName = 'Contact Choice';
      choiceField.type = Types.Container;
      choiceField.wrapperKind = 'choice';
      choiceField.selectedMemberIndex = undefined;

      const emailField = new XmlSchemaField(choiceField, 'email', false);
      emailField.displayName = 'Email';
      emailField.type = Types.String;

      const phoneField = new XmlSchemaField(choiceField, 'phone', false);
      phoneField.displayName = 'Phone';
      phoneField.type = Types.String;

      choiceField.fields = [emailField, phoneField];
      parentField.fields.push(choiceField);

      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const orderNode = tree.root.children[0];
      const lastChild = orderNode.children.length - 1;
      const choiceNode = orderNode.children[lastChild];
      return { documentNodeData, choiceNode, choiceField, mappingTree };
    };

    it('should hide children for unconfigured target choice wrapper', () => {
      const { choiceNode } = createTargetChoiceFieldNode();
      expect(VisualizationService.hasChildren(choiceNode.nodeData)).toBe(false);
      const children = VisualizationService.generateNonDocumentNodeDataChildren(choiceNode.nodeData);
      expect(children).toHaveLength(0);
    });

    it('should show choice members in context menu for unconfigured target choice wrapper', () => {
      const { documentNodeData, choiceNode } = createTargetChoiceFieldNode();

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      act(() => {
        fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));
      });

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
    });

    it('should create FieldItem on target-side when selecting a choice member', () => {
      const { documentNodeData, choiceNode, choiceField } = createTargetChoiceFieldNode();

      const setSpy = vi.spyOn(ChoiceSelectionService, 'setChoiceSelection');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      act(() => {
        fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));
      });

      act(() => {
        fireEvent.click(screen.getByText('Email'));
      });

      expect(setSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, 0, expect.any(Object));
      setSpy.mockRestore();
    });

    it('should call clearChoiceSelection when clearing choice selection on target-side', () => {
      const { documentNodeData, choiceNode, choiceField, mappingTree } = createTargetChoiceFieldNode();
      choiceField.selectedMemberIndex = 0;
      const choiceTargetNode = choiceNode.nodeData as TargetChoiceFieldNodeData;
      choiceTargetNode.mapping = new FieldItem(mappingTree, choiceField.fields[0]);

      const clearSpy = vi.spyOn(ChoiceSelectionService, 'clearChoiceSelection');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      act(() => {
        fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));
      });

      act(() => {
        fireEvent.click(screen.getByText('Clear selection'));
      });

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });

    it('should show children after member is selected on target choice wrapper', () => {
      const { choiceNode, choiceField, mappingTree } = createTargetChoiceFieldNode();
      choiceField.selectedMemberIndex = 0;
      const choiceTargetNode = choiceNode.nodeData as TargetChoiceFieldNodeData;
      choiceTargetNode.mapping = new FieldItem(mappingTree, choiceField.fields[0]);
      expect(VisualizationService.hasChildren(choiceTargetNode)).toBe(true);
    });
  });

  describe('clearDescendantSelections', () => {
    it('should clear inner choice selection when clearing outer choice', () => {
      const document = TestUtil.createSourceOrderDoc();
      const parentField = document.fields[0];
      const outerChoiceField = new XmlSchemaField(parentField, 'outerChoice', false);
      outerChoiceField.displayName = 'Outer Choice';
      outerChoiceField.type = Types.Container;
      outerChoiceField.wrapperKind = 'choice';
      outerChoiceField.selectedMemberIndex = 0;

      const innerChoiceField = new XmlSchemaField(outerChoiceField, 'innerChoice', false);
      innerChoiceField.displayName = 'Inner Choice';
      innerChoiceField.type = Types.Container;
      innerChoiceField.wrapperKind = 'choice';
      innerChoiceField.selectedMemberIndex = 1;

      const innerAField = new XmlSchemaField(innerChoiceField, 'innerA', false);
      innerAField.displayName = 'InnerA';
      innerAField.type = Types.String;
      const innerBField = new XmlSchemaField(innerChoiceField, 'innerB', false);
      innerBField.displayName = 'InnerB';
      innerBField.type = Types.String;
      innerChoiceField.fields = [innerAField, innerBField];

      const plainMember = new XmlSchemaField(outerChoiceField, 'plain', false);
      plainMember.displayName = 'Plain';
      plainMember.type = Types.String;
      outerChoiceField.fields = [innerChoiceField, plainMember];
      parentField.fields.push(outerChoiceField);

      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const orderNode = tree.root.children[0];
      const lastChild = orderNode.children.length - 1;
      const choiceNode = orderNode.children[lastChild];

      const clearSpy = vi.spyOn(ChoiceSelectionService, 'clearChoiceSelection').mockImplementation(vi.fn());

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
        fireEvent.click(screen.getByText('Clear selection'));
      });

      expect(innerChoiceField.selectedMemberIndex).toBeUndefined();
      clearSpy.mockRestore();
    });
  });

  describe('abstract-in-choice dissolution', () => {
    const NS_CHOICE_ABSTRACT = 'http://www.example.com/CHOICE_ABSTRACT';

    function createChoiceWithAbstractDoc(docType: DocumentType = DocumentType.SOURCE_BODY) {
      const definition = new DocumentDefinition(docType, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
        'ChoiceWithAbstract.xsd': getChoiceWithAbstractXsd(),
      });
      definition.rootElementChoice = { namespaceUri: NS_CHOICE_ABSTRACT, name: 'Notification' };
      const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
      if (result.validationStatus !== 'success' || !result.document) {
        throw new Error(
          result.errors?.map((e) => e.message).join('; ') || 'Failed to create choice+abstract test document',
        );
      }
      return result.document;
    }

    function findChoiceTreeNode(docType: DocumentType = DocumentType.SOURCE_BODY) {
      const document = createChoiceWithAbstractDoc(docType);
      const isTarget = docType === DocumentType.TARGET_BODY;
      let documentNodeData;
      if (isTarget) {
        const mappingTree = new MappingTree(
          document.documentType,
          document.documentId,
          DocumentDefinitionType.XML_SCHEMA,
        );
        documentNodeData = new TargetDocumentNodeData(document, mappingTree);
      } else {
        documentNodeData = new DocumentNodeData(document);
      }
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const rootNode = tree.root.children[0];
      const choiceNode = rootNode.children.find(
        (c) => c.nodeData instanceof FieldNodeData && c.nodeData.field?.wrapperKind === 'choice',
      );
      if (!choiceNode) throw new Error('Choice tree node not found');
      const choiceField = (choiceNode.nodeData as FieldNodeData).field;
      return { document, documentNodeData, choiceNode, choiceField, isTarget };
    }

    it('should dissolve abstract member into substitution candidates in context menu', () => {
      const { documentNodeData, choiceNode } = findChoiceTreeNode(DocumentType.SOURCE_BODY);

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
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Webhook')).toBeInTheDocument();
      expect(screen.queryByText('AbstractMessage')).not.toBeInTheDocument();
    });

    it('should set both selectedMemberIndex and substituteQName when selecting dissolved abstract candidate', () => {
      const { documentNodeData, choiceNode, choiceField } = findChoiceTreeNode(DocumentType.SOURCE_BODY);

      const setSpy = vi.spyOn(ChoiceSelectionService, 'setChoiceSelection').mockImplementation(vi.fn());
      const applySpy = vi.spyOn(FieldOverrideService, 'applyFieldSubstitution').mockImplementation(vi.fn());

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
        fireEvent.click(screen.getByText('Email'));
      });

      const abstractMemberIndex = choiceField.fields.findIndex((f) => f.wrapperKind === 'abstract');
      expect(setSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, abstractMemberIndex, expect.any(Object));
      expect(applySpy).toHaveBeenCalledWith(
        choiceField.fields[abstractMemberIndex],
        expect.stringContaining('Email'),
        expect.any(Object),
      );
      setSpy.mockRestore();
      applySpy.mockRestore();
    });

    it('should dissolve abstract candidates in target-side context menu', () => {
      const { documentNodeData, choiceNode } = findChoiceTreeNode(DocumentType.TARGET_BODY);

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      act(() => {
        fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));
      });

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Webhook')).toBeInTheDocument();
      expect(screen.queryByText('AbstractMessage')).not.toBeInTheDocument();
    });
  });
});
