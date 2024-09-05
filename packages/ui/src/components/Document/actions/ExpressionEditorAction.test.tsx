import { ExpressionEditorAction } from './ExpressionEditorAction';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MappingTree, ValueSelector } from '../../../models/datamapper/mapping';
import { DocumentType } from '../../../models/datamapper/path';
import { BODY_DOCUMENT_ID } from '../../../models/datamapper/document';
import { TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { TestUtil } from '../../../stubs/data-mapper';

describe('ExpressionEditorAction', () => {
  it('should open expression editor modal', async () => {
    const doc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const docData = new TargetDocumentNodeData(doc, tree);
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <ExpressionEditorAction mapping={new ValueSelector(tree)} nodeData={docData} onUpdate={jest.fn()} />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    const editBtn = await screen.findByTestId(`edit-expression-button-${docData.id}`);
    act(() => {
      fireEvent.click(editBtn);
    });
    const modal = await screen.findByTestId('expression-editor-modal');
    expect(modal).toBeInTheDocument();
  }, 10000);
});
