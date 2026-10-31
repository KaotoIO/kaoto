import { fireEvent, render, screen } from '@testing-library/react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../../models/datamapper/document';
import { FieldItem, ForEachItem, IfItem, MappingTree, ValueOfSelector } from '../../../models/datamapper/mapping';
import { XPathCommitResult } from '../../../models/datamapper/mapping-action';
import { FieldItemNodeData, MappingNodeData, TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { MappingActionService } from '../../../services/visualization/mapping-action.service';
import { TargetRenderService } from '../../../services/visualization/target-render.service';
import { VisualizationService } from '../../../services/visualization/visualization.service';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { TargetNodeActions } from './TargetNodeActions';

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
    });

    function renderGuardedNote() {
      const sourceDoc = TestUtil.createSourceOrderDoc();
      const targetDoc = TestUtil.createTargetOrderDoc();
      const shipOrderField = targetDoc.fields[0];
      const itemField = shipOrderField.fields.find((field) => field.name === 'Item')!;
      const noteField = itemField.fields.find((field) => field.name === 'Note')!;
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

      const renderIndex = TargetRenderService.buildIndex(tree, {
        sourceParameterMap: new Map<string, IDocument>(),
        sourceBody: sourceDoc,
      });
      const shipOrderNode = VisualizationService.generateStructuredDocumentChildren(
        new TargetDocumentNodeData(targetDoc, tree, renderIndex),
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
      'should dispatch the callback matching a "%s" commit result on blur',
      async (result, updateCalls, structuralUpdateCalls) => {
        const commitExpressionSpy = vi.spyOn(MappingActionService, 'commitExpression').mockReturnValue(result);
        const { selector, nodeData, onUpdate, onStructuralUpdate } = renderGuardedNote();
        const input = await screen.findByTestId('transformation-xpath-input');

        fireEvent.blur(input);

        expect(commitExpressionSpy).toHaveBeenCalledWith(nodeData, selector);
        expect(onUpdate).toHaveBeenCalledTimes(updateCalls);
        expect(onStructuralUpdate).toHaveBeenCalledTimes(structuralUpdateCalls);
      },
    );
  });
});
