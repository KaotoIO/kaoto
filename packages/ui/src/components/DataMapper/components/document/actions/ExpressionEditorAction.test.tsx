import { ExpressionEditorAction } from './ExpressionEditorAction';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MappingTree, ValueSelector } from '../../../models/mapping';
import { TestUtil } from '../../../test/test-util';
import { DocumentType } from '../../../models/path';
import { BODY_DOCUMENT_ID } from '../../../models/document';
import { TargetDocumentNodeData } from '../../../models/visualization';
import { DataMapperProvider } from '../../../providers';
import { CanvasProvider } from '../../../providers/CanvasProvider';

describe('ExpressionEditorAction', () => {
  it('should open expression editor modal', async () => {
    const doc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    const docData = new TargetDocumentNodeData(doc, tree);
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <ExpressionEditorAction mapping={new ValueSelector(tree)} nodeData={docData} onUpdate={jest.fn()} />
        </CanvasProvider>
      </DataMapperProvider>,
    );
    const editBtn = await screen.findByTestId(`edit-expression-button-${docData.id}`);
    act(() => {
      fireEvent.click(editBtn);
    });
    const modal = await screen.findByTestId('expression-editor-modal');
    expect(modal).toBeInTheDocument();
  });
});
