import { act, render, screen, waitFor } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';

import { useDataMapper } from '../../hooks/useDataMapper';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../../models/datamapper/document';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { XmlSchemaDocumentService } from '../../services/document/xml-schema/xml-schema-document.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { getShipOrderXsd } from '../../stubs/datamapper/data-mapper';
import { SourcePanel } from './SourcePanel';

// Mock ResizeObserver and RAF are already handled globally in vitest-setup.ts

describe('SourcePanel', () => {
  it('should render action buttons by default', () => {
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <SourcePanel />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(screen.getByTestId('add-parameter-button')).toBeInTheDocument();
    expect(screen.getByTestId('attach-schema-sourceBody-Body-button')).toBeInTheDocument();
    expect(screen.getByTestId('detach-schema-sourceBody-Body-button')).toBeInTheDocument();
  });
  it('should not render action buttons if isReadOnly=true', () => {
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <SourcePanel isReadOnly />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(screen.queryByTestId('add-parameter-button')).toBeFalsy();
    expect(screen.queryByTestId('attach-schema-sourceBody-Body-button')).toBeFalsy();
    expect(screen.queryByTestId('detach-schema-sourceBody-Body-button')).toBeFalsy();
  });

  describe.each([
    { documentType: DocumentType.SOURCE_BODY, documentId: 'Body', documentNodeId: 'doc-sourceBody-Body' },
    { documentType: DocumentType.PARAM, documentId: 'order', documentNodeId: 'doc-param-order' },
  ])('when the $documentType schema is attached again', ({ documentType, documentId, documentNodeId }) => {
    const getStoredPortPaths = () =>
      Object.keys(useDocumentTreeStore.getState().nodesConnectionPorts[documentNodeId]?.nodes ?? {}).sort();
    const getRenderedPortPaths = () =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-connection-port="true"][data-document-node-id="${documentNodeId}"]:not([data-edge])`,
        ),
        (port) => port.dataset.nodePath,
      ).sort();

    it('should key the connection ports by the new node paths', async () => {
      const definition = new DocumentDefinition(documentType, DocumentDefinitionType.XML_SCHEMA, documentId, {
        'ShipOrder.xsd': getShipOrderXsd(),
      });
      const isParameter = documentType === DocumentType.PARAM;
      const documentInitializationModel = new DocumentInitializationModel(
        isParameter ? { [documentId]: definition } : {},
        isParameter ? undefined : definition,
      );
      let dataMapper!: ReturnType<typeof useDataMapper>;
      const CaptureDataMapper = () => {
        dataMapper = useDataMapper();
        return null;
      };
      render(
        <DataMapperProvider documentInitializationModel={documentInitializationModel}>
          <MappingLinksProvider>
            <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 40 }}>
              <SourcePanel />
              <CaptureDataMapper />
            </VirtuosoMockContext.Provider>
          </MappingLinksProvider>
        </DataMapperProvider>,
      );
      await waitFor(() => {
        expect(getRenderedPortPaths().length).toBeGreaterThan(1);
        expect(getStoredPortPaths()).toEqual(getRenderedPortPaths());
      });
      const previousPortPaths = getStoredPortPaths();

      // A schema attached again is parsed anew: its fields get new IDs, so the node paths change, not their count.
      act(() => {
        const previousDocument = isParameter
          ? dataMapper.sourceParameterMap.get(documentId)!
          : dataMapper.sourceBodyDocument;
        const { document: reattachedDocument } = XmlSchemaDocumentService.createXmlSchemaDocument(
          previousDocument.definition,
        );
        dataMapper.updateDocument(
          reattachedDocument!,
          previousDocument.definition,
          previousDocument.getReferenceId(dataMapper.mappingTree.namespaceMap),
        );
      });

      await waitFor(() => {
        expect(getRenderedPortPaths()).not.toEqual(previousPortPaths);
        expect(getRenderedPortPaths()).toHaveLength(previousPortPaths.length);
        expect(getStoredPortPaths()).toEqual(getRenderedPortPaths());
      });
    });
  });

  it('should trigger handleLayoutChange when panel is toggled', async () => {
    vi.useFakeTimers();

    // Ensure RAF is accessible in fake timer context - execute callbacks synchronously for tests
    // Store original RAF to restore later
    const originalRAF = globalThis.requestAnimationFrame;

    // Create RAF mock that executes immediately and is accessible globally
    const rafCallbacks: Array<FrameRequestCallback> = [];
    const rafMock = (cb: FrameRequestCallback): number => {
      rafCallbacks.push(cb);
      // Execute in next microtask to avoid immediate nested execution issues
      queueMicrotask(() => {
        const callback = rafCallbacks.shift();
        if (callback) callback(Date.now());
      });
      return rafCallbacks.length;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = rafMock;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).requestAnimationFrame = rafMock;

    const { unmount } = render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <SourcePanel />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );

    // Find the Body panel summary and click to collapse
    const sourceBodyHeader = screen.getByTestId('document-doc-sourceBody-Body');
    const bodyPanel = sourceBodyHeader.closest('.expansion-panel__summary') as HTMLElement;
    expect(bodyPanel).toBeInTheDocument();

    await act(async () => {
      bodyPanel.click();
      // Advance timers to trigger onLayoutChange (160ms delay)
      // Also run all pending timers including RAF callbacks
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
      // Wait for any queued RAF callbacks
      await new Promise((resolve) => {
        queueMicrotask(() => {
          resolve(undefined);
        });
      });
    });

    // The panel should now be collapsed (data-expanded=false)
    const panel = sourceBodyHeader.closest('.expansion-panel');
    expect(panel).toHaveAttribute('data-expanded', 'false');

    // Clean up
    unmount();
    await new Promise((resolve) => {
      queueMicrotask(() => {
        resolve(undefined);
      });
    }); // Wait for cleanup RAF calls

    // Restore original RAF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = originalRAF;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).requestAnimationFrame = originalRAF;
    vi.useRealTimers();
  });
});
