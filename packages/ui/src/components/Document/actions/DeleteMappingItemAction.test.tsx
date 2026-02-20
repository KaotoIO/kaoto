import { act, fireEvent, render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { ForEachItem, MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { MappingNodeData, TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { MappingSerializerService } from '../../../services/mapping-serializer.service';
import { conditionalMappingsToShipOrderXslt, TestUtil } from '../../../stubs/datamapper/data-mapper';
import { DeleteMappingItemAction } from './DeleteMappingItemAction';

describe('DeleteMappingItemAction', () => {
  it('should invoke onDelete()', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const docData = new TargetDocumentNodeData(targetDoc, mappingTree);
    const nodeData = new MappingNodeData(docData, new ValueSelector(mappingTree));
    const onDeleteMock = jest.fn();
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <DeleteMappingItemAction nodeData={nodeData} onDelete={onDeleteMock} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    const deleteBtn = await screen.findByTestId('delete-mapping-btn');
    act(() => {
      fireEvent.click(deleteBtn);
    });
    const cancelBtn = screen.getByTestId('delete-mapping-cancel-btn');
    act(() => {
      fireEvent.click(cancelBtn);
    });
    expect(onDeleteMock.mock.calls.length).toBe(0);
    act(() => {
      fireEvent.click(deleteBtn);
    });
    const confirmBtn = screen.getByTestId('delete-mapping-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });
    expect(onDeleteMock.mock.calls.length).toBe(1);
  });

  it('should show warning when there are child mappings', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const paramsMap = TestUtil.createParameterMap();
    const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);
    MappingSerializerService.deserialize(conditionalMappingsToShipOrderXslt, targetDoc, tree, paramsMap);

    const docData = new TargetDocumentNodeData(targetDoc, tree);
    const nodeData = new MappingNodeData(docData, tree.children[0].children[0] as ForEachItem);
    const onDeleteMock = jest.fn();
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <DeleteMappingItemAction nodeData={nodeData} onDelete={onDeleteMock} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    const deleteBtn = await screen.findByTestId('delete-mapping-btn');
    act(() => {
      fireEvent.click(deleteBtn);
    });
    act(() => {
      fireEvent.click(deleteBtn);
    });

    expect(screen.getByTestId('delete-mapping-modal')).toBeInTheDocument();
    expect(screen.getByText('Delete for-each mapping?')).toBeInTheDocument();
    expect(
      screen.getByText('Deleting a for-each mapping will also remove all its child mappings.'),
    ).toBeInTheDocument();
    const confirmBtn = screen.getByTestId('delete-mapping-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });
    expect(onDeleteMock.mock.calls.length).toBe(1);
  });
});
