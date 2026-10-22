import { fireEvent, render, screen } from '@testing-library/react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../../models/datamapper/document';
import { FieldItem, IfItem, MappingTree, ValueOfSelector } from '../../../models/datamapper/mapping';
import { FieldItemNodeData, MappingNodeData, TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
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

  describe('optional guard reconciliation', () => {
    function renderGuardedField() {
      const targetDoc = TestUtil.createTargetOrderDoc();
      const field = targetDoc.fields[0].fields[1];
      field.minOccurs = 0;
      const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
      const rootItem = new FieldItem(tree, targetDoc.fields[0]);
      tree.children.push(rootItem);
      const ifItem = new IfItem(rootItem);
      ifItem.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      ifItem.isAutoOptionalIf = true;
      rootItem.children.push(ifItem);
      const fieldItem = new FieldItem(ifItem, field);
      ifItem.children.push(fieldItem);
      const selector = new ValueOfSelector(fieldItem);
      selector.expression = '/ns0:ShipOrder/ns0:OrderPerson';
      fieldItem.children.push(selector);
      const nodeData = new FieldItemNodeData(new TargetDocumentNodeData(targetDoc, tree), fieldItem);
      nodeData.autoOptionalIfItem = ifItem;
      const onUpdate = vi.fn();
      const onStructuralUpdate = vi.fn();
      render(
        <DataMapperProvider>
          <MappingLinksProvider>
            <TargetNodeActions nodeData={nodeData} onUpdate={onUpdate} onStructuralUpdate={onStructuralUpdate} />
          </MappingLinksProvider>
        </DataMapperProvider>,
      );
      return { ifItem, onUpdate, onStructuralUpdate };
    }

    it('should only refresh the tree structure on blur, not while typing', async () => {
      const { ifItem, onStructuralUpdate } = renderGuardedField();
      const input = await screen.findByTestId('transformation-xpath-input');

      fireEvent.change(input, { target: { value: "concat(/ns0:ShipOrder/ns0:OrderPerson, '!')" } });
      expect(onStructuralUpdate).not.toHaveBeenCalled();

      fireEvent.blur(input);
      expect(ifItem.isAutoOptionalIf).toBe(false);
      expect(onStructuralUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
