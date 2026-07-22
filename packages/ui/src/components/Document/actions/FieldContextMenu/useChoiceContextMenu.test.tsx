import { fireEvent, render, screen } from '@testing-library/react';
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
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { WrapperSelectionService } from '../../../../services/document/wrapper-selection.service';
import { XmlSchemaField } from '../../../../services/document/xml-schema/xml-schema-document.model';
import { XmlSchemaDocumentService } from '../../../../services/document/xml-schema/xml-schema-document.service';
import { MappingService } from '../../../../services/mapping/mapping.service';
import { TreeParsingService } from '../../../../services/visualization/tree-parsing.service';
import { VisualizationService } from '../../../../services/visualization/visualization.service';
import { WrapperActionService } from '../../../../services/visualization/wrapper-action.service';
import { getChoiceWithAbstractXsd, getTestDocumentXsd, TestUtil } from '../../../../stubs/datamapper/data-mapper';
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

  const NS_TEST = 'io.kaoto.datamapper.poc.test';

  const createLargeChoiceFieldNode = () => {
    const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
      'TestDocument.xsd': getTestDocumentXsd(),
    });
    definition.rootElementChoice = { namespaceUri: NS_TEST, name: 'TestDocument' };
    const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
    if (result.validationStatus !== 'success' || !result.document) {
      throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create TestDocument');
    }
    const document = result.document;
    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const rootNode = tree.root.children[0];
    const choiceNode = rootNode.children.find(
      (c) => c.nodeData instanceof FieldNodeData && c.nodeData.field?.name === 'LargeChoiceElement',
    );
    if (!choiceNode) throw new Error('LargeChoiceElement not found');
    const largeChoiceField = (choiceNode.nodeData as FieldNodeData).field;
    const innerChoiceNode = choiceNode.children.find(
      (c) => c.nodeData instanceof FieldNodeData && c.nodeData.field?.wrapperKind === 'choice',
    );
    if (!innerChoiceNode) throw new Error('Choice wrapper not found under LargeChoiceElement');
    return { documentNodeData, choiceNode: innerChoiceNode, choiceField: largeChoiceField };
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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('Fax')).toBeInTheDocument();
    expect(screen.queryByText('Clear selection')).not.toBeInTheDocument();
  });

  it('should show Clear selection, Select Member... and Override for selected choice (Case B)', () => {
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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    expect(screen.getByText('Clear selection')).toBeInTheDocument();
    expect(screen.getByText('Select Member...')).toBeInTheDocument();
    expect(screen.getByText('Override Field...')).toBeInTheDocument();
  });

  it('should open choice modal with current selection when clicking Select Member... on selected choice', () => {
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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    fireEvent.click(screen.getByText('Select Member...'));

    expect(screen.getByText('Select member for Contact Choice')).toBeInTheDocument();
  });

  it('should call setChoiceSelection when clicking a choice member', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);

    const setSpy = vi.spyOn(WrapperSelectionService, 'setChoiceSelection');

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    fireEvent.click(screen.getByText('Phone'));

    expect(setSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, 1, expect.any(Object));
    setSpy.mockRestore();
  });

  it('should call clearChoiceSelection when clicking Clear selection', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);
    choiceField.selectedMemberIndex = 1;

    const clearSpy = vi.spyOn(WrapperSelectionService, 'clearChoiceSelection');

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={choiceNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    fireEvent.click(screen.getByText('Clear selection'));

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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    expect(screen.getByText('Select Member...')).toBeInTheDocument();
    expect(screen.queryByText('OptionA')).not.toBeInTheDocument();
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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    fireEvent.click(screen.getByText('Select Member...'));

    expect(screen.getByText('Select member for choice')).toBeInTheDocument();
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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

    fireEvent.click(screen.getByText('Select Member...'));

    expect(screen.getByText('Select member for choice')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Select member for choice')).not.toBeInTheDocument();
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

    fireEvent.contextMenu(screen.getByTestId(`node-source-${memberNode.nodeData.id}`));

    expect(screen.getByText("Select 'Email' in '(Email | Phone | Fax)'")).toBeInTheDocument();
    expect(screen.getByText('Override Field...')).toBeInTheDocument();
  });

  it('should call setChoiceSelection when clicking Select action on choice member (Case C)', () => {
    const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);
    const memberNode = choiceNode.children[1];

    const setSpy = vi.spyOn(WrapperSelectionService, 'setChoiceSelection').mockImplementation(vi.fn());

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={memberNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    fireEvent.contextMenu(screen.getByTestId(`node-source-${memberNode.nodeData.id}`));

    fireEvent.click(screen.getByText(/Select 'Phone'/));

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

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      expect(screen.getByText('InnerA')).toBeInTheDocument();
      expect(screen.getByText('InnerB')).toBeInTheDocument();
      expect(screen.getByText('InnerC')).toBeInTheDocument();
      expect(screen.getByText('Clear selection')).toBeInTheDocument();
    });

    it('should call setChoiceSelection on inner wrapper when clicking an inner member', () => {
      const { documentNodeData, choiceNode, innerChoiceField } = createNestedChoiceFieldNode();

      const setSpy = vi.spyOn(WrapperSelectionService, 'setChoiceSelection').mockImplementation(vi.fn());

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('InnerB'));

      expect(setSpy).toHaveBeenCalledWith(expect.any(Object), innerChoiceField, 1, expect.any(Object));
      setSpy.mockRestore();
    });

    it('should call clearChoiceSelection on outer wrapper when clicking Clear selection', () => {
      const { documentNodeData, choiceNode, outerChoiceField } = createNestedChoiceFieldNode();

      const clearSpy = vi.spyOn(WrapperSelectionService, 'clearChoiceSelection').mockImplementation(vi.fn());

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Clear selection'));

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

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      expect(screen.queryByText(/Select '.*' in '.*'/)).not.toBeInTheDocument();
    });

    it('should clear parent (middle) wrapper, not outermost, in 3-level nesting', () => {
      const document = TestUtil.createSourceOrderDoc();
      const parentField = document.fields[0];

      const outerChoiceField = new XmlSchemaField(parentField, 'outerChoice', false);
      outerChoiceField.displayName = 'Outer';
      outerChoiceField.type = Types.Container;
      outerChoiceField.wrapperKind = 'choice';
      outerChoiceField.selectedMemberIndex = 0;

      const middleChoiceField = new XmlSchemaField(outerChoiceField, 'middleChoice', false);
      middleChoiceField.displayName = 'Middle';
      middleChoiceField.type = Types.Container;
      middleChoiceField.wrapperKind = 'choice';
      middleChoiceField.selectedMemberIndex = 0;

      const innerChoiceField = new XmlSchemaField(middleChoiceField, 'innerChoice', false);
      innerChoiceField.displayName = 'Inner';
      innerChoiceField.type = Types.Container;
      innerChoiceField.wrapperKind = 'choice';

      const leafA = new XmlSchemaField(innerChoiceField, 'leafA', false);
      leafA.displayName = 'LeafA';
      leafA.type = Types.String;
      const leafB = new XmlSchemaField(innerChoiceField, 'leafB', false);
      leafB.displayName = 'LeafB';
      leafB.type = Types.String;
      innerChoiceField.fields = [leafA, leafB];

      middleChoiceField.fields = [innerChoiceField];

      const plainOuter = new XmlSchemaField(outerChoiceField, 'plainOuter', false);
      plainOuter.displayName = 'PlainOuter';
      plainOuter.type = Types.String;
      outerChoiceField.fields = [middleChoiceField, plainOuter];

      parentField.fields.push(outerChoiceField);

      const documentNodeData = new DocumentNodeData(document);
      const tree = new DocumentTree(documentNodeData);
      TreeParsingService.parseTree(tree);
      const orderNode = tree.root.children[0];
      const choiceNode = orderNode.children[orderNode.children.length - 1];

      const clearSpy = vi.spyOn(WrapperSelectionService, 'clearChoiceSelection').mockImplementation(vi.fn());

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Clear selection'));

      expect(clearSpy).toHaveBeenCalledWith(expect.any(Object), middleChoiceField, expect.any(Object));
      clearSpy.mockRestore();
    });
  });

  const createTargetChoiceFieldNode = (maxOccurs?: number | 'unbounded') => {
    const document = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(document.documentType, document.documentId, DocumentDefinitionType.XML_SCHEMA);
    const documentNodeData = new TargetDocumentNodeData(document, mappingTree);
    const parentField = document.fields[0];

    const choiceField = new XmlSchemaField(parentField, 'contactChoice', false);
    choiceField.displayName = 'Contact Choice';
    choiceField.type = Types.Container;
    choiceField.wrapperKind = 'choice';
    choiceField.selectedMemberIndex = undefined;
    if (maxOccurs !== undefined) choiceField.maxOccurs = maxOccurs;

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

  describe('target-side choice wrapper', () => {
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

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
    });

    it('should create FieldItem on target-side when selecting a choice member', () => {
      const { documentNodeData, choiceNode, choiceField } = createTargetChoiceFieldNode();

      const setSpy = vi.spyOn(WrapperSelectionService, 'setChoiceSelection');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Email'));

      expect(setSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, 0, expect.any(Object));
      setSpy.mockRestore();
    });

    it('should call clearChoiceSelection when clearing choice selection on target-side', () => {
      const { documentNodeData, choiceNode, choiceField, mappingTree } = createTargetChoiceFieldNode();
      choiceField.selectedMemberIndex = 0;
      const choiceTargetNode = choiceNode.nodeData as TargetChoiceFieldNodeData;
      choiceTargetNode.mapping = new FieldItem(mappingTree, choiceField.fields[0]);

      const clearSpy = vi.spyOn(WrapperSelectionService, 'clearChoiceSelection');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Clear selection'));

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });

    it('should return to unconfigured state after select then clear (no orphan FieldItem)', () => {
      const { documentNodeData, choiceNode, choiceField, mappingTree } = createTargetChoiceFieldNode();
      const doc = choiceField.ownerDocument;
      WrapperSelectionService.setChoiceSelection(doc, choiceField, 0, mappingTree.namespaceMap);
      const choiceTargetNode = choiceNode.nodeData as TargetChoiceFieldNodeData;
      const fieldItem = new FieldItem(mappingTree, choiceField.fields[0]);
      mappingTree.children.push(fieldItem);
      choiceTargetNode.mapping = fieldItem;

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));
      fireEvent.click(screen.getByText('Clear selection'));

      expect(choiceField.selectedMemberIndex).toBeUndefined();
      expect(mappingTree.children).toHaveLength(0);
    });

    it('should show children after member is selected on target choice wrapper', () => {
      const { choiceNode, choiceField, mappingTree } = createTargetChoiceFieldNode();
      choiceField.selectedMemberIndex = 0;
      const choiceTargetNode = choiceNode.nodeData as TargetChoiceFieldNodeData;
      choiceTargetNode.mapping = new FieldItem(mappingTree, choiceField.fields[0]);
      expect(VisualizationService.hasChildren(choiceTargetNode)).toBe(true);
    });
  });

  describe('target-side choice wrapper with maxOccurs>1', () => {
    it('should call dispatchChoiceSelection when selecting member on maxOccurs>1 choice', () => {
      const { documentNodeData, choiceNode, mappingTree } = createTargetChoiceFieldNode('unbounded');
      const applySpy = vi.spyOn(WrapperActionService, 'dispatchChoiceSelection');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Email'));

      expect(applySpy).toHaveBeenCalled();
      const createdFieldItem = mappingTree.children
        .flatMap((c) => (c instanceof FieldItem ? c.children : []))
        .find((c) => c instanceof FieldItem && c.field.name === 'email') as FieldItem | undefined;
      expect(createdFieldItem?.isUserCreated).toBe(true);
      applySpy.mockRestore();
    });

    it('should not set selectedMemberIndex on wrapper after selection on maxOccurs>1 choice (per-instance)', () => {
      const { documentNodeData, choiceNode, choiceField } = createTargetChoiceFieldNode('unbounded');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Phone'));

      expect(choiceField.selectedMemberIndex).toBeUndefined();
    });

    it('should still call setChoiceSelection for maxOccurs=1 choice (regression)', () => {
      const { documentNodeData, choiceNode, choiceField } = createTargetChoiceFieldNode('unbounded');
      choiceField.maxOccurs = 1;
      const setSpy = vi.spyOn(WrapperSelectionService, 'setChoiceSelection');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Email'));

      expect(setSpy).toHaveBeenCalledWith(expect.any(Object), choiceField, 0, expect.any(Object));
      setSpy.mockRestore();
    });

    it('should revert FieldItem field when clearing per-instance selection on maxOccurs>1', () => {
      const { choiceField, mappingTree } = createTargetChoiceFieldNode('unbounded');
      const fieldItem = new FieldItem(mappingTree, choiceField.fields[0]);
      fieldItem.isUserCreated = true;
      mappingTree.children.push(fieldItem);

      fieldItem.children = [];
      MappingService.updateFieldItemField(fieldItem, choiceField);

      expect(choiceField.selectedMemberIndex).toBeUndefined();
      expect(mappingTree.children).toHaveLength(1);
      expect((mappingTree.children[0] as FieldItem).field).toBe(choiceField);
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

      const clearSpy = vi.spyOn(WrapperSelectionService, 'clearChoiceSelection').mockImplementation(vi.fn());

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Clear selection'));

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

    function buildDocumentTree(docType: DocumentType) {
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
      return { document, documentNodeData, tree };
    }

    function findChoiceTreeNode(docType: DocumentType = DocumentType.SOURCE_BODY) {
      const { document, documentNodeData, tree } = buildDocumentTree(docType);
      const rootNode = tree.root.children[0];
      const shortNode = rootNode.children.find(
        (c) => c.nodeData instanceof FieldNodeData && c.nodeData.field?.name === 'Short',
      );
      if (!shortNode) throw new Error('Short node not found');
      const choiceNode = shortNode.children.find(
        (c) => c.nodeData instanceof FieldNodeData && c.nodeData.field?.wrapperKind === 'choice',
      );
      if (!choiceNode) throw new Error('Choice tree node not found');
      const choiceField = (choiceNode.nodeData as FieldNodeData).field;
      return { document, documentNodeData, choiceNode, choiceField };
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

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Webhook')).toBeInTheDocument();
      expect(screen.queryByText('AbstractMessage')).not.toBeInTheDocument();
    });

    it('should set both selectedMemberIndex and substituteQName when selecting dissolved abstract candidate', () => {
      const { documentNodeData, choiceNode, choiceField } = findChoiceTreeNode(DocumentType.SOURCE_BODY);

      const setSpy = vi.spyOn(WrapperSelectionService, 'setChoiceSelection').mockImplementation(vi.fn());
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

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Email'));

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

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('SMS')).toBeInTheDocument();
      expect(screen.getByText('Webhook')).toBeInTheDocument();
      expect(screen.queryByText('AbstractMessage')).not.toBeInTheDocument();
    });

    it('should return to unconfigured state after select then clear on choice-with-abstract (no orphan FieldItem)', () => {
      const { documentNodeData, choiceNode, choiceField } = findChoiceTreeNode(DocumentType.TARGET_BODY);
      const mappingTree = (documentNodeData as TargetDocumentNodeData).mappingTree;
      const doc = choiceField.ownerDocument;
      const webhookIndex = choiceField.fields.findIndex((f) => f.name === 'Webhook');
      WrapperSelectionService.setChoiceSelection(doc, choiceField, webhookIndex, mappingTree.namespaceMap);
      const choiceTargetNode = choiceNode.nodeData as TargetChoiceFieldNodeData;
      const fieldItem = new FieldItem(mappingTree, choiceField.fields[webhookIndex]);
      mappingTree.children.push(fieldItem);
      choiceTargetNode.mapping = fieldItem;

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));
      fireEvent.click(screen.getByText('Clear selection'));

      expect(choiceField.selectedMemberIndex).toBeUndefined();
      expect(mappingTree.children).toHaveLength(0);
    });

    it('should revert FieldItem field when clearing per-instance selection on maxOccurs>1 choice-with-abstract', () => {
      const { tree } = buildDocumentTree(DocumentType.TARGET_BODY);
      const mappingTree = (tree.root.nodeData as TargetDocumentNodeData).mappingTree;
      const rootNode = tree.root.children[0];
      const largeNode = rootNode.children.find(
        (c) => c.nodeData instanceof FieldNodeData && c.nodeData.field?.name === 'Large',
      );
      if (!largeNode) throw new Error('Large node not found');
      const unboundedChoiceNode = largeNode.children.find((c) => {
        if (!(c.nodeData instanceof FieldNodeData)) return false;
        const f = c.nodeData.field;
        return f?.wrapperKind === 'choice' && f.maxOccurs !== 1;
      });
      if (!unboundedChoiceNode) throw new Error('Unbounded choice node not found in Large');
      const unboundedChoiceField = (unboundedChoiceNode.nodeData as FieldNodeData).field;
      const webhookMultiIndex = unboundedChoiceField.fields.findIndex((f) => f.name === 'WebhookMulti');
      const fieldItem = new FieldItem(mappingTree, unboundedChoiceField.fields[webhookMultiIndex]);
      fieldItem.isUserCreated = true;
      mappingTree.children.push(fieldItem);

      fieldItem.children = [];
      MappingService.updateFieldItemField(fieldItem, unboundedChoiceField);

      expect(unboundedChoiceField.selectedMemberIndex).toBeUndefined();
      expect(mappingTree.children).toHaveLength(1);
      expect((mappingTree.children[0] as FieldItem).field).toBe(unboundedChoiceField);
    });

    function findUnboundedChoiceTreeNode() {
      const { document, documentNodeData, tree } = buildDocumentTree(DocumentType.TARGET_BODY);
      const rootNode = tree.root.children[0];
      const shortNode = rootNode.children.find(
        (c) => c.nodeData instanceof FieldNodeData && c.nodeData.field?.name === 'Short',
      );
      if (!shortNode) throw new Error('Short node not found');
      const choiceNode = shortNode.children.find((c) => {
        if (!(c.nodeData instanceof FieldNodeData)) return false;
        const f = c.nodeData.field;
        return f?.wrapperKind === 'choice' && f.maxOccurs !== 1;
      });
      if (!choiceNode) throw new Error('Unbounded choice node not found in Short');
      const choiceField = (choiceNode.nodeData as FieldNodeData).field;
      return { document, documentNodeData, choiceNode, choiceField };
    }

    it('should not mutate shared abstract field when selecting dissolved abstract candidate on maxOccurs>1 choice (per-instance)', () => {
      const { document, documentNodeData, choiceNode, choiceField } = findUnboundedChoiceTreeNode();
      const abstractMember = choiceField.fields.find((f) => f.wrapperKind === 'abstract');
      if (!abstractMember) throw new Error('Abstract member not found in choice');

      const applySubSpy = vi.spyOn(FieldOverrideService, 'applyFieldSubstitution');
      const dispatchSpy = vi.spyOn(WrapperActionService, 'dispatchChoiceSelection');

      render(
        <TargetDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-target-${choiceNode.nodeData.id}`));

      fireEvent.click(screen.getByText('Email'));

      expect(applySubSpy).not.toHaveBeenCalled();
      expect(dispatchSpy).toHaveBeenCalled();
      expect(abstractMember.selectedMemberQName).toBeUndefined();
      expect(document.definition.fieldSubstitutions ?? []).toHaveLength(0);

      applySubSpy.mockRestore();
      dispatchSpy.mockRestore();
    });
  });

  describe('source-side choice wrapper with maxOccurs>1', () => {
    it('should show choice members in context menu for source-side maxOccurs>1 choice', () => {
      const { documentNodeData, choiceNode, choiceField } = createChoiceFieldNode(false);
      choiceField.maxOccurs = 'unbounded';

      render(
        <SourceDocumentNodeWithContextMenu
          treeNode={choiceNode}
          documentId={documentNodeData.id}
          isReadOnly={false}
          rank={1}
        />,
        { wrapper },
      );

      fireEvent.contextMenu(screen.getByTestId(`node-source-${choiceNode.nodeData.id}`));

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('Fax')).toBeInTheDocument();
    });
  });
});
