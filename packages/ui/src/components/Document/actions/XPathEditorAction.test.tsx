import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree, ValueOfSelector } from '../../../models/datamapper/mapping';
import { TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { XPathEditorAction } from './XPathEditorAction';

describe('XPathEditorAction', () => {
  it('should open xpath editor modal', async () => {
    const doc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const docData = new TargetDocumentNodeData(doc, tree);
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <XPathEditorAction mapping={new ValueOfSelector(tree)} nodeData={docData} onUpdate={vi.fn()} />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    const editBtn = await screen.findByTestId(`edit-xpath-button-${docData.id}`);
    fireEvent.click(editBtn);
    const modal = await screen.findByTestId('xpath-editor-modal');
    expect(modal).toBeInTheDocument();
    const monaco = await screen.findByTestId('xpath-editor');
    expect(monaco).toBeInTheDocument();
    const textbox = await screen.findByRole('textbox');
    expect(textbox).toBeInTheDocument();
  }, 30000);

  it('should call onCommit once the editor modal is closed', async () => {
    const doc = TestUtil.createTargetOrderDoc();
    const tree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);
    const docData = new TargetDocumentNodeData(doc, tree);
    const onCommit = vi.fn();
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <XPathEditorAction
            mapping={new ValueOfSelector(tree)}
            nodeData={docData}
            onUpdate={vi.fn()}
            onCommit={onCommit}
          />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );

    fireEvent.click(await screen.findByTestId(`edit-xpath-button-${docData.id}`));
    await screen.findByTestId('xpath-editor-modal');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('close-xpath-editor-btn'));

    await waitFor(() => {
      expect(onCommit).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('xpath-editor-modal')).not.toBeInTheDocument();
  }, 30000);
});
