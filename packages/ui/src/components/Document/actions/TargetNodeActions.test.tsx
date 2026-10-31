import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  IField,
  PrimitiveDocument,
} from '../../../models/datamapper/document';
import { FieldItem, ForEachItem, IfItem, MappingTree, ValueOfSelector } from '../../../models/datamapper/mapping';
import { MappingActionKind, XPathCommitResult } from '../../../models/datamapper/mapping-action';
import {
  FieldItemNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { MappingService } from '../../../services/mapping/mapping.service';
import { MappingActionService } from '../../../services/visualization/mapping-action.service';
import { MappingActionRegistryService } from '../../../services/visualization/mapping-action-registry.service';
import { TargetRenderService } from '../../../services/visualization/target-render.service';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { useDocumentTreeStore } from '../../../store/document-tree.store';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { TargetNodeActions } from './TargetNodeActions';

const findField = (parent: IDocument | IField, name: string): IField => {
  const field = parent.fields.find((child) => child.name === name);
  if (!field) throw new Error(`No field named '${name}'`);
  return field;
};

describe('TargetNodeActions', () => {
  it('should not render context menu for schema-attached target document', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const nodeData = new TargetDocumentNodeData(targetDoc, tree);
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <TargetNodeActions nodeData={nodeData} onUpdate={vi.fn()} onStructuralUpdate={vi.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(screen.queryByTestId('transformation-actions-menu-toggle')).not.toBeInTheDocument();
  });

  it('should render context menu for primitive target document', async () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const tree = new MappingTree(primitiveDoc.documentType, primitiveDoc.documentId, DocumentDefinitionType.Primitive);
    const nodeData = new TargetDocumentNodeData(primitiveDoc, tree);
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <TargetNodeActions nodeData={nodeData} onUpdate={vi.fn()} onStructuralUpdate={vi.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-actions-menu-toggle')).toBeTruthy();
  });

  it('should render expression action', async () => {
    const primitiveDoc = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );
    const tree = new MappingTree(primitiveDoc.documentType, primitiveDoc.documentId, DocumentDefinitionType.Primitive);
    const docData = new TargetDocumentNodeData(primitiveDoc, tree);
    const mappingData = new MappingNodeData(docData, new ValueOfSelector(tree));
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <TargetNodeActions nodeData={mappingData} onUpdate={vi.fn()} onStructuralUpdate={vi.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('transformation-xpath-input')).toBeInTheDocument();
    expect(screen.getByTestId(`edit-xpath-button-${mappingData.id}`)).toBeInTheDocument();
  });

  describe('XPath commit', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      act(() => {
        useDocumentTreeStore.getState().clearXPathInputFocusRequest();
      });
    });

    function renderGuardedNote() {
      const sourceDoc = TestUtil.createSourceOrderDoc();
      const targetDoc = TestUtil.createTargetOrderDoc();
      const shipOrderField = targetDoc.fields[0];
      const itemField = findField(shipOrderField, 'Item');
      const noteField = findField(itemField, 'Note');
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      tree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
      const shipOrderItem = new FieldItem(tree, shipOrderField);
      tree.children.push(shipOrderItem);
      const forEachItem = new ForEachItem(shipOrderItem);
      forEachItem.expression = '/ns0:ShipOrder/Item';
      shipOrderItem.children.push(forEachItem);
      const itemFieldItem = new FieldItem(forEachItem, itemField);
      forEachItem.children.push(itemFieldItem);
      const ifItem = new IfItem(itemFieldItem);
      ifItem.expression = 'Note';
      itemFieldItem.children.push(ifItem);
      const noteFieldItem = new FieldItem(ifItem, noteField);
      ifItem.children.push(noteFieldItem);
      const selector = new ValueOfSelector(noteFieldItem);
      selector.expression = 'Note';
      noteFieldItem.children.push(selector);

      const buildRenderIndex = () =>
        TargetRenderService.buildIndex(tree, {
          sourceParameterMap: new Map<string, IDocument>(),
          sourceBody: sourceDoc,
        });
      const shipOrderNode = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree, buildRenderIndex()),
      )[0];
      const forEachNode = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode).find(
        (node) => node instanceof MappingNodeData && node.mapping === forEachItem,
      ) as MappingNodeData;
      const itemNode = VisualizationService.generateNonDocumentNodeDataChildren(forEachNode)[0];
      const nodeData = VisualizationService.generateNonDocumentNodeDataChildren(itemNode).find(
        (node) => node instanceof FieldItemNodeData && node.mapping === noteFieldItem,
      ) as FieldItemNodeData;
      const onUpdate = vi.fn();
      const onStructuralUpdate = vi.fn();
      render(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TargetNodeActions nodeData={nodeData} onUpdate={onUpdate} onStructuralUpdate={onStructuralUpdate} />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );
      return { ifItem, selector, nodeData, onUpdate, onStructuralUpdate };
    }

    it('should only refresh the tree structure on blur, not while typing', async () => {
      const { ifItem, nodeData, onStructuralUpdate } = renderGuardedNote();
      const input = await screen.findByTestId('transformation-xpath-input');

      expect(nodeData.autoOptionalIfItem).toBe(ifItem);
      fireEvent.change(input, { target: { value: "concat(Note, '!')" } });
      expect(onStructuralUpdate).not.toHaveBeenCalled();

      fireEvent.blur(input);
      expect(ifItem.expression).toBe('Note');
      expect(onStructuralUpdate).toHaveBeenCalledTimes(1);
    });

    it.each<[XPathCommitResult, number, number]>([
      ['none', 0, 0],
      ['update', 1, 0],
      ['structural-update', 0, 1],
    ])(
      'should dispatch the callback matching a "%s" commit result on Enter',
      async (result, updateCalls, structuralUpdateCalls) => {
        const commitExpressionSpy = vi.spyOn(MappingActionService, 'commitExpression').mockReturnValue(result);
        const restoreFocusSpy = vi.spyOn(MappingActionService, 'restoreFocusAfterAbsorb');
        const { selector, nodeData, onUpdate, onStructuralUpdate } = renderGuardedNote();
        const input = await screen.findByTestId('transformation-xpath-input');

        fireEvent.keyDown(input, { key: 'Enter' });

        expect(commitExpressionSpy).toHaveBeenCalledWith(nodeData, selector);
        expect(onUpdate).toHaveBeenCalledTimes(updateCalls);
        expect(onStructuralUpdate).toHaveBeenCalledTimes(structuralUpdateCalls);
        expect(restoreFocusSpy).toHaveBeenCalledTimes(structuralUpdateCalls);
      },
    );

    it('should ask for focus to be restored before refreshing the tree structure', async () => {
      vi.spyOn(MappingActionService, 'commitExpression').mockReturnValue('structural-update');
      const restoreFocusSpy = vi.spyOn(MappingActionService, 'restoreFocusAfterAbsorb');
      const { selector, nodeData, onStructuralUpdate } = renderGuardedNote();

      fireEvent.keyDown(await screen.findByTestId('transformation-xpath-input'), { key: 'Enter' });

      expect(restoreFocusSpy).toHaveBeenCalledWith(nodeData, selector);
      expect(restoreFocusSpy.mock.invocationCallOrder[0]).toBeLessThan(onStructuralUpdate.mock.invocationCallOrder[0]);
    });

    it('should not ask for focus to be restored when a blur moves focus nowhere', async () => {
      vi.spyOn(MappingActionService, 'commitExpression').mockReturnValue('structural-update');
      const restoreFocusSpy = vi.spyOn(MappingActionService, 'restoreFocusAfterAbsorb');
      const { onStructuralUpdate } = renderGuardedNote();

      fireEvent.blur(await screen.findByTestId('transformation-xpath-input'));

      expect(onStructuralUpdate).toHaveBeenCalledTimes(1);
      expect(restoreFocusSpy).not.toHaveBeenCalled();
    });

    it('should not ask for focus to be restored when the blur moves focus to a control outside the row', async () => {
      vi.spyOn(MappingActionService, 'commitExpression').mockReturnValue('structural-update');
      const restoreFocusSpy = vi.spyOn(MappingActionService, 'restoreFocusAfterAbsorb');
      const { onStructuralUpdate } = renderGuardedNote();
      const otherControl = document.createElement('button');
      document.body.appendChild(otherControl);

      fireEvent.blur(await screen.findByTestId('transformation-xpath-input'), { relatedTarget: otherControl });

      expect(onStructuralUpdate).toHaveBeenCalledTimes(1);
      expect(restoreFocusSpy).not.toHaveBeenCalled();
      otherControl.remove();
    });

    it('should pass the row render index to the XPath input, so a focus restore request waits for the rebuilt row', async () => {
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      const { nodeData } = renderGuardedNote();
      const input = await screen.findByTestId('transformation-xpath-input');
      const notePath = nodeData.mapping.nodePath.toString();

      act(() => {
        useDocumentTreeStore.getState().requestXPathInputFocus(notePath, nodeData.renderIndex.generation);
      });

      expect(input).not.toHaveFocus();
      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBe(notePath);

      act(() => {
        useDocumentTreeStore.getState().requestXPathInputFocus(notePath, nodeData.renderIndex.generation - 1);
      });

      expect(input).toHaveFocus();
      expect(useDocumentTreeStore.getState().targetXPathInputForFocus).toBeNull();
    });
  });

  describe('Context menu and delete actions', () => {
    afterEach(() => {
      vi.restoreAllMocks();
      act(() => {
        useDocumentTreeStore.getState().setOpenMappingMenuId(null);
      });
    });

    function createShipOrderNodes() {
      const sourceDoc = TestUtil.createSourceOrderDoc();
      const targetDoc = TestUtil.createTargetOrderDoc();
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      tree.namespaceMap = { ns0: 'io.kaoto.datamapper.poc.test' };
      const shipOrderItem = MappingService.createFieldItem(tree, findField(targetDoc, 'ShipOrder'));
      const itemItem = MappingService.createFieldItem(shipOrderItem, findField(shipOrderItem.field, 'Item'));
      const noteItem = MappingService.createFieldItem(itemItem, findField(itemItem.field, 'Note'));
      MappingService.mapToField(findField(findField(findField(sourceDoc, 'ShipOrder'), 'Item'), 'Note'), noteItem);

      const renderIndex = TargetRenderService.buildIndex(tree, {
        sourceParameterMap: new Map<string, IDocument>(),
        sourceBody: sourceDoc,
      });
      const shipOrderNode = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree, renderIndex),
      )[0];
      const shipOrderChildren = VisualizationService.generateNonDocumentNodeDataChildren(shipOrderNode);
      const itemNode = shipOrderChildren.find(
        (node) => node instanceof FieldItemNodeData && node.mapping === itemItem,
      ) as FieldItemNodeData;
      const noteNode = VisualizationService.generateNonDocumentNodeDataChildren(itemNode).find(
        (node) => node instanceof FieldItemNodeData && node.mapping === noteItem,
      ) as FieldItemNodeData;
      const orderPersonNode = shipOrderChildren.find(
        (node) => node instanceof TargetFieldNodeData && node.field.name === 'OrderPerson',
      ) as TargetFieldNodeData;
      return { noteNode, orderPersonNode };
    }

    function createValueSelectorNode() {
      const primitiveDoc = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );
      const tree = new MappingTree(
        primitiveDoc.documentType,
        primitiveDoc.documentId,
        DocumentDefinitionType.Primitive,
      );
      return new MappingNodeData(new TargetDocumentNodeData(primitiveDoc, tree), new ValueOfSelector(tree));
    }

    function renderActions(nodeData: TargetNodeData) {
      render(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TargetNodeActions nodeData={nodeData} onUpdate={vi.fn()} onStructuralUpdate={vi.fn()} />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );
    }

    it('should not run the "Add optional guard" source check when rendering a row', async () => {
      const user = userEvent.setup();
      const canAddOptionalGuardSpy = vi.spyOn(TargetRenderService, 'canAddOptionalGuard');
      const { noteNode } = createShipOrderNodes();

      renderActions(noteNode);

      const actionToggle = await screen.findByTestId('transformation-actions-menu-toggle');
      expect(screen.getByTestId('delete-mapping-btn')).toBeInTheDocument();
      expect(canAddOptionalGuardSpy).not.toHaveBeenCalled();

      await user.click(actionToggle);

      expect(await screen.findByTestId('transformation-actions-add-optional-guard')).toBeInTheDocument();
      expect(canAddOptionalGuardSpy).toHaveBeenCalledWith(noteNode);
    });

    it.each<[string, () => TargetNodeData, boolean, boolean]>([
      ['a mapped field row', () => createShipOrderNodes().noteNode, true, true],
      ['a field row without a mapping', () => createShipOrderNodes().orderPersonNode, true, false],
      ['a value selector row', createValueSelectorNode, false, true],
    ])(
      'should render the context menu and the delete action as isActionAllowed decides for %s',
      (_label, createNodeData, isContextMenuAllowed, isDeleteAllowed) => {
        const isActionAllowedSpy = vi.spyOn(MappingActionRegistryService, 'isActionAllowed');
        const nodeData = createNodeData();

        renderActions(nodeData);

        expect(isActionAllowedSpy).toHaveBeenCalledWith(nodeData, MappingActionKind.ContextMenu);
        expect(isActionAllowedSpy).toHaveBeenCalledWith(nodeData, MappingActionKind.Delete);
        expect(screen.queryAllByTestId('transformation-actions-menu-toggle')).toHaveLength(
          isContextMenuAllowed ? 1 : 0,
        );
        expect(screen.queryAllByTestId('delete-mapping-btn')).toHaveLength(isDeleteAllowed ? 1 : 0);
      },
    );
  });
});
