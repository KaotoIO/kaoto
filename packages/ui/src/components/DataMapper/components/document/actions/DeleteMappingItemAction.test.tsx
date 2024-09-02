import { DeleteMappingItemAction } from './DeleteMappingItemAction';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MappingNodeData, TargetDocumentNodeData } from '../../../models/visualization';
import { MappingTree, ValueSelector } from '../../../models/mapping';
import { DocumentType } from '../../../models/path';
import { BODY_DOCUMENT_ID } from '../../../models/document';
import { TestUtil } from '../../../test/test-util';
import { CanvasProvider } from '../../../providers/CanvasProvider';
import { DataMapperProvider } from '../../../providers';

describe('DeleteMappingItemAction', () => {
  it('should invoke onDelete()', () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const docData = new TargetDocumentNodeData(targetDoc, mappingTree);
    const nodeData = new MappingNodeData(docData, new ValueSelector(mappingTree));
    const onDeleteMock = jest.fn();
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <DeleteMappingItemAction nodeData={nodeData} onDelete={onDeleteMock} />
        </CanvasProvider>
      </DataMapperProvider>,
    );
    const deleteBtn = screen.getByTestId('delete-mapping-btn');
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
