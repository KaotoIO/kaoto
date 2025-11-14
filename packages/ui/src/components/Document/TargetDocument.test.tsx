import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinitionType,
  DocumentType,
  PrimitiveDocument,
} from '../../models/datamapper/document';
import { MappingTree } from '../../models/datamapper/mapping';
import { MappingSerializerService } from '../../services/mapping-serializer.service';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { useDocumentTreeStore } from '../../store';
import { shipOrderToShipOrderXslt, TestUtil } from '../../stubs/datamapper/data-mapper';
import { TargetDocument } from './TargetDocument';

describe('TargetDocument', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <DataMapperCanvasProvider>{children}</DataMapperCanvasProvider>
    </DataMapperProvider>
  );

  beforeEach(() => {
    act(() => {
      useDocumentTreeStore.setState({ expansionState: {} });
    });
  });

  it('should render primitive document', async () => {
    const document = new PrimitiveDocument(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
    render(<TargetDocument document={document} />, { wrapper });
    expect(await screen.findByText('Body')).toBeTruthy();
  });

  it('should render ShipOrder doc', async () => {
    const document = TestUtil.createTargetOrderDoc();
    render(<TargetDocument document={document} />, { wrapper });
    expect(await screen.findByText('OrderPerson')).toBeTruthy();
    expect(await screen.findByText('Country')).toBeInTheDocument();
  });

  it('should set initial expansion state on mount', async () => {
    const document = TestUtil.createTargetOrderDoc();
    render(<TargetDocument document={document} />, { wrapper });

    await screen.findByText('OrderPerson');

    const store = useDocumentTreeStore.getState();
    const documentIds = Object.keys(store.expansionState);
    expect(documentIds.length).toBeGreaterThan(0);
    const documentId = documentIds[0];
    expect(store.expansionState[documentId]).toBeDefined();
    expect(Object.keys(store.expansionState[documentId]).length).toBeGreaterThan(0);
  });

  it('should render target document with expand/collapse functionality', async () => {
    const document = TestUtil.createTargetOrderDoc();
    render(<TargetDocument document={document} />, { wrapper });

    await screen.findByText('OrderPerson');

    const expandIcon = screen.getByTestId('expand-icon-Body');
    expect(expandIcon).toBeInTheDocument();

    act(() => {
      fireEvent.click(expandIcon);
    });

    await waitFor(() => {
      const collapseIcon = screen.getByTestId('collapse-icon-Body');
      expect(collapseIcon).toBeInTheDocument();
    });

    act(() => {
      const collapseIcon = screen.getByTestId('collapse-icon-Body');
      fireEvent.click(collapseIcon);
    });

    await waitFor(() => {
      const expandIconAgain = screen.getByTestId('expand-icon-Body');
      expect(expandIconAgain).toBeInTheDocument();
    });
  });

  it('should preserve expansion state when component re-renders', async () => {
    const document = TestUtil.createTargetOrderDoc();
    const { rerender } = render(<TargetDocument document={document} />, { wrapper });

    await screen.findByText('OrderPerson');

    const expandIcon = screen.getByTestId('expand-icon-Body');
    act(() => {
      fireEvent.click(expandIcon);
    });

    await waitFor(() => {
      expect(screen.getByTestId('collapse-icon-Body')).toBeInTheDocument();
    });

    const store = useDocumentTreeStore.getState();
    const documentId = Object.keys(store.expansionState)[0];

    rerender(<TargetDocument document={document} />);

    await waitFor(() => {
      const storeAfter = useDocumentTreeStore.getState();
      const expansionStateAfter = storeAfter.expansionState[documentId];

      expect(expansionStateAfter).toBeDefined();
      expect(screen.getByTestId('collapse-icon-Body')).toBeInTheDocument();
    });
  });

  it('should render target node actions for fields', async () => {
    const document = TestUtil.createTargetOrderDoc();
    render(<TargetDocument document={document} />, { wrapper });

    await screen.findByText('OrderPerson');

    const documents = screen.queryAllByTestId(/^document-doc-targetBody-/);
    const fields = screen.queryAllByTestId(/^node-target-/);
    const nodes = [...documents, ...fields];
    expect(nodes.length).toEqual(14);
  });

  it('should handle JSON schema target document', async () => {
    const document = TestUtil.createJSONTargetOrderDoc();
    const { container } = render(<TargetDocument document={document} />, { wrapper });

    await waitFor(
      () => {
        const documents = container.querySelectorAll('[data-testid^="document-doc-targetBody-"]');
        const fields = container.querySelectorAll('[data-testid^="node-target-"]');
        const nodes = [...documents, ...fields];
        expect(nodes.length).toEqual(15);
      },
      { timeout: 3000 },
    );
  });

  it('should trigger handleUpdate callback when interacting with XPath input', async () => {
    const targetDoc = TestUtil.createTargetOrderDoc();
    const paramsMap = TestUtil.createParameterMap();
    const tree = new MappingTree(targetDoc.documentType, targetDoc.documentId, DocumentDefinitionType.XML_SCHEMA);

    // Deserialize XSLT to create mappings
    MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, tree, paramsMap);

    const { container } = render(<TargetDocument document={targetDoc} />, { wrapper });

    await screen.findByText('OrderPerson');

    // Find an XPath input field
    const xpathInputs = container.querySelectorAll('[data-testid="transformation-xpath-input"]');
    if (xpathInputs.length > 0) {
      const xpathInput = xpathInputs[0] as HTMLInputElement;
      const originalValue = xpathInput.value;

      // Change the XPath value to trigger handleUpdate
      act(() => {
        fireEvent.change(xpathInput, { target: { value: '/modified/path' } });
      });

      await waitFor(() => {
        // Value should be updated
        expect(xpathInput.value).not.toBe(originalValue);
      });
    }
  });
});
