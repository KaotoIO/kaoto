import { fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import type { Mock } from 'vitest';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import { TargetDocumentNodeData } from '../../models/datamapper/visualization';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { useDocumentTreeStore } from '../../store';
import { TestUtil } from '../../stubs/datamapper/data-mapper';
import { ExpansionContext } from '../ExpansionPanels/ExpansionContext';
import { ExpansionPanel } from '../ExpansionPanels/ExpansionPanel';
import { DocumentContent, DocumentHeader } from './BaseDocument';
import { TargetDocumentNode } from './TargetDocumentNode';

describe('DocumentHeader', () => {
  afterEach(() => {
    useDocumentTreeStore.getState().clearSelection();
  });

  it('should render with enableDnD=false (default)', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    expect(screen.queryByTestId('drag-handler')).not.toBeInTheDocument();
  });

  it('should render with enableDnD=true', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    const { container } = render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
          enableDnD
        />
      </DataMapperProvider>,
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    const dragHandler = container.querySelector('[data-drag-handler]');
    expect(dragHandler).toBeInTheDocument();
  });

  it('should render attach/detach schema buttons when not read-only', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    expect(screen.getByTestId(`attach-schema-targetBody-${BODY_DOCUMENT_ID}-button`)).toBeInTheDocument();
    expect(screen.getByTestId(`detach-schema-targetBody-${BODY_DOCUMENT_ID}-button`)).toBeInTheDocument();
  });

  it('should update store selection when clicking the header', () => {
    const document = new PrimitiveDocument(
      new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
    );

    render(
      <DataMapperProvider>
        <DocumentHeader
          header={<div>Test Header</div>}
          document={document}
          documentType={DocumentType.TARGET_BODY}
          isReadOnly={false}
        />
      </DataMapperProvider>,
    );

    const headerContainer = screen.getByTestId(`document-doc-targetBody-${BODY_DOCUMENT_ID}`);
    fireEvent.click(headerContainer);

    const store = useDocumentTreeStore.getState();
    expect(store.selectedNodePath).toBeTruthy();
  });

  /**
   * Characterization tests for a DocumentHeader rendered as an ExpansionPanel summary,
   * which is how every source body, target body and parameter panel is composed.
   *
   * A header click selects the node for mapping and nothing else; expansion belongs to
   * the panel's disclosure button. These tests pin that split so any further
   * restructuring of the summary (see issue #3651) has to change it deliberately.
   *
   * Before the disclosure refactor a single header click did both at once, because
   * DocumentHeader deliberately does not stop propagation.
   */
  describe('as an ExpansionPanel summary', () => {
    const HEADER_TEST_ID = `document-doc-targetBody-${BODY_DOCUMENT_ID}`;

    function renderInPanel(mockSetExpanded: Mock, additionalActions?: ReactNode[]) {
      const document = new PrimitiveDocument(
        new DocumentDefinition(DocumentType.TARGET_BODY, DocumentDefinitionType.Primitive, BODY_DOCUMENT_ID),
      );

      return render(
        <DataMapperProvider>
          <ExpansionContext.Provider
            value={{
              register: vi.fn(),
              unregister: vi.fn(),
              resize: vi.fn(),
              setExpanded: mockSetExpanded,
              queueLayoutChange: vi.fn(),
              registerLayoutCallback: vi.fn(),
              unregisterLayoutCallback: vi.fn(),
            }}
          >
            <ExpansionPanel
              id="target-body"
              defaultExpanded
              summary={
                <DocumentHeader
                  header={<div>Test Header</div>}
                  document={document}
                  documentType={DocumentType.TARGET_BODY}
                  isReadOnly={false}
                  additionalActions={additionalActions}
                />
              }
            >
              <div>Panel content</div>
            </ExpansionPanel>
          </ExpansionContext.Provider>
        </DataMapperProvider>,
      );
    }

    it('should select the node without toggling the panel when the header is clicked', () => {
      const mockSetExpanded = vi.fn();
      renderInPanel(mockSetExpanded);

      const headerContainer = screen.getByTestId(HEADER_TEST_ID);
      const panel = headerContainer.closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'true');

      fireEvent.click(headerContainer);

      // Selection: handled by DocumentHeader itself.
      expect(useDocumentTreeStore.getState().selectedNodePath).toBeTruthy();
      // Expansion is now owned solely by the disclosure button, so the panel is untouched.
      expect(mockSetExpanded).not.toHaveBeenCalled();
      expect(panel).toHaveAttribute('data-expanded', 'true');
    });

    it('should toggle the panel without selecting the node when the disclosure button is clicked', () => {
      const mockSetExpanded = vi.fn();
      renderInPanel(mockSetExpanded);

      fireEvent.click(screen.getByTestId('target-body-disclosure'));

      expect(mockSetExpanded).toHaveBeenCalledWith('target-body', false);
      expect(useDocumentTreeStore.getState().selectedNodePath).toBeFalsy();
    });

    it('should not toggle the panel when an action inside the header is clicked', () => {
      const mockSetExpanded = vi.fn();
      renderInPanel(mockSetExpanded, [
        <button key="custom" type="button" data-testid="custom-action">
          Custom
        </button>,
      ]);

      fireEvent.click(screen.getByTestId('custom-action'));

      // DocumentHeader stops propagation on its action list, so the panel is unaffected.
      expect(mockSetExpanded).not.toHaveBeenCalled();
    });

    it('should not treat the summary itself as a control', () => {
      const mockSetExpanded = vi.fn();
      renderInPanel(mockSetExpanded);

      const summary = screen.getByTestId(HEADER_TEST_ID).closest('.expansion-panel__summary') as HTMLElement;

      // The summary is a plain container; DocumentHeader is no longer nested inside a
      // second role="button", which is what made Enter/Space ambiguous.
      expect(summary).not.toHaveAttribute('role', 'button');
      fireEvent.keyDown(summary, { key: 'Enter' });

      expect(mockSetExpanded).not.toHaveBeenCalled();
    });
  });
});

describe('DocumentContent', () => {
  it('should render child nodes', () => {
    const document = TestUtil.createTargetOrderDoc();
    const mappingTree = new MappingTree(document.documentType, document.documentId, document.definitionType);
    const documentNodeData = new TargetDocumentNodeData(document, mappingTree);

    const tree: ReturnType<typeof TreeUIService.createTree> = TreeUIService.createTree(documentNodeData);

    const { container } = render(
      <DataMapperProvider>
        <DocumentContent
          treeNode={tree!.root}
          isReadOnly={false}
          renderNodes={(childNode) => (
            <TargetDocumentNode treeNode={childNode} documentId={documentNodeData.id} rank={1} />
          )}
        />
      </DataMapperProvider>,
    );

    const nodes = container.querySelectorAll('[data-testid^="node-target-"]');
    expect(nodes.length).toBeGreaterThan(0);
  });
});
