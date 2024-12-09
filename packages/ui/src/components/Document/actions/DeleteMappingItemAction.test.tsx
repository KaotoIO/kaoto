import { DeleteMappingItemAction } from './DeleteMappingItemAction';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MappingNodeData, TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { DocumentType } from '../../../models/datamapper/path';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { TestUtil } from '../../../stubs/data-mapper';

describe('DeleteMappingItemAction', () => {
  it('should invoke onDelete()', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const docData = new TargetDocumentNodeData(targetDoc, mappingTree);
    const nodeData = new MappingNodeData(docData, new ValueSelector(mappingTree));
    const onDeleteMock = jest.fn();
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <DeleteMappingItemAction nodeData={nodeData} onDelete={onDeleteMock} />
        </DataMapperCanvasProvider>
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
});
