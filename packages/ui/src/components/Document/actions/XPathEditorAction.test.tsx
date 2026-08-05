import { fireEvent, render, screen } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree, ValueOfSelector } from '../../../models/datamapper/mapping';
import { TargetDocumentNodeData } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { TestUtil } from '../../../stubs/datamapper/data-mapper';
import { XPathEditorAction } from './XPathEditorAction';

vi.mock('../../XPath/XPathEditor', () => ({
  XPathEditor: ({ mapping }: { mapping: ValueOfSelector }) => (
    <input data-testid="xpath-editor" value={mapping.expression} readOnly />
  ),
}));

vi.mock('monaco-editor', () => ({
  languages: {
    CompletionItemKind: { Keyword: 17, Function: 1 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  },
}));

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
});
