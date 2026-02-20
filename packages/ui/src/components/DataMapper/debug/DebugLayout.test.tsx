import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import { MappingTree } from '../../../models/datamapper/mapping';
import { IMappingLink } from '../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DatamapperDndProvider } from '../../../providers/datamapper-dnd.provider';
import { SourceTargetDnDHandler } from '../../../providers/dnd/SourceTargetDnDHandler';
import { MappingLinksService } from '../../../services/mapping-links.service';
import { MappingSerializerService } from '../../../services/mapping-serializer.service';
import { useDocumentTreeStore } from '../../../store';
import { shipOrderToShipOrderXslt, TestUtil } from '../../../stubs/datamapper/data-mapper';
import { DebugLayout } from './DebugLayout';

const dndHandler = new SourceTargetDnDHandler();

const TestProviders: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <DataMapperProvider>
    <DatamapperDndProvider handler={dndHandler}>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DatamapperDndProvider>
  </DataMapperProvider>
);

describe('DebugLayout', () => {
  afterAll(() => {
    jest.resetModules();
    jest.resetAllMocks();
  });

  afterEach(() => {
    act(() => {
      useDocumentTreeStore.getState().clearSelection();
    });
  });

  // Skipped: JSDOM cannot render the full DataMapperControl layout (expansion panels require real dimensions)
  it.skip('should render Documents and mappings', async () => {
    let mappingLinks: IMappingLink[] = [];
    const LoadMappings: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const {
        mappingTree,
        setMappingTree,
        sourceParameterMap,
        setSourceBodyDocument,
        setTargetBodyDocument,
        sourceBodyDocument,
      } = useDataMapper();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, mappingTree, sourceParameterMap);
        setMappingTree(mappingTree);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        mappingLinks = MappingLinksService.extractMappingLinks(mappingTree, sourceParameterMap, sourceBodyDocument);
      }, [mappingTree, sourceBodyDocument, sourceParameterMap]);
      return <>{children}</>;
    };
    const mockDebug = jest.fn();
    console.debug = mockDebug;
    render(
      <TestProviders>
        <LoadMappings>
          <DebugLayout />
        </LoadMappings>
      </TestProviders>,
    );
    await screen.findAllByText('ShipOrder');
    const targetDocuments = screen.queryAllByTestId(/^document-doc-targetBody-.*/);
    const targetFields = screen.queryAllByTestId(/^node-target-.*/);
    const targetNodes = [...targetDocuments, ...targetFields];
    expect(targetNodes.length).toEqual(21);
    expect(mappingLinks.length).toEqual(11);
    expect(mappingLinks.filter((link) => link.isSelected).length).toEqual(0);
    const connectionPortsLog = mockDebug.mock.calls.filter((call) => call[0].startsWith('Connection Ports: ['));
    expect(connectionPortsLog.length).toBeGreaterThan(0);
  });

  // Skipped: JSDOM cannot render the full DataMapperControl layout (expansion panels require real dimensions)
  it.skip('should update store selection when clicking a node', async () => {
    const LoadMappings: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { mappingTree, setMappingTree, sourceParameterMap, setSourceBodyDocument, setTargetBodyDocument } =
        useDataMapper();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, mappingTree, sourceParameterMap);
        setMappingTree(mappingTree);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <>{children}</>;
    };
    console.debug = jest.fn();
    render(
      <TestProviders>
        <LoadMappings>
          <DebugLayout />
        </LoadMappings>
      </TestProviders>,
    );

    const targetOrderId = await screen.findByTestId(/node-target-fx-OrderId-.*/);
    act(() => {
      fireEvent.click(targetOrderId);
    });
    await waitFor(() => {
      const store = useDocumentTreeStore.getState();
      expect(store.selectedNodePath).toMatch(/targetBody:Body:\/\/fx-ShipOrder-.*\/fx-OrderId-.*/);
    });

    const sourceOrderId = await screen.findByTestId(/node-source-fx-OrderId-.*/);
    act(() => {
      fireEvent.click(sourceOrderId);
    });
    await waitFor(() => {
      const store = useDocumentTreeStore.getState();
      expect(store.selectedNodePath).toMatch(/sourceBody:Body:\/\/fx-ShipOrder-.*\/fx-OrderId-.*/);
    });
  });

  describe('Main Menu', () => {
    it('should import and export mappings', async () => {
      let spyOnMappingTree: MappingTree;
      const TestLoader: FunctionComponent<PropsWithChildren> = ({ children }) => {
        const { mappingTree, setSourceBodyDocument, setTargetBodyDocument } = useDataMapper();
        useEffect(() => {
          const sourceDoc = TestUtil.createSourceOrderDoc();
          setSourceBodyDocument(sourceDoc);
          const targetDoc = TestUtil.createTargetOrderDoc();
          setTargetBodyDocument(targetDoc);
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        useEffect(() => {
          spyOnMappingTree = mappingTree;
        }, [mappingTree]);
        return <>{children}</>;
      };
      const mockDebug = jest.fn();
      console.debug = mockDebug;
      render(
        <TestProviders>
          <TestLoader>
            <DebugLayout />
          </TestLoader>
        </TestProviders>,
      );
      let mainMenuButton = await screen.findByTestId('dm-debug-main-menu-button');
      act(() => {
        fireEvent.click(mainMenuButton);
      });
      const importButton = screen.getByTestId('dm-debug-import-mappings-button');
      act(() => {
        fireEvent.click(importButton);
      });
      const fileContent = new File([new Blob([shipOrderToShipOrderXslt])], 'ShipOrderToShipOrder.xsl', {
        type: 'text/plain',
      });
      const fileInput = screen.getByTestId('dm-debug-import-mappings-file-input');
      expect(spyOnMappingTree!.children.length).toBe(0);
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });
      await waitFor(() => expect(spyOnMappingTree!.children.length).toBe(1));

      mainMenuButton = screen.getByTestId('dm-debug-main-menu-button');
      act(() => {
        fireEvent.click(mainMenuButton);
      });
      const exportButton = screen.getByTestId('dm-debug-export-mappings-button');
      act(() => {
        fireEvent.click(exportButton.getElementsByTagName('button')[0]);
      });
      const modal = await screen.findAllByTestId('dm-debug-export-mappings-modal');
      expect(modal).toBeTruthy();
      const closeModalButton = screen.getByTestId('dm-debug-export-mappings-modal-close-btn');
      act(() => {
        fireEvent.click(closeModalButton);
      });
      expect(screen.queryByTestId('dm-debug-export-mappings-modal')).toBeFalsy();
      const connectionPortsLog = mockDebug.mock.calls.filter((call) => call[0].startsWith('Connection Ports: ['));
      expect(connectionPortsLog.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe('debug', () => {
    it('should output debug info to console', async () => {
      const TestLoader: FunctionComponent<PropsWithChildren> = ({ children }) => {
        const {
          setDebug,
          mappingTree,
          setMappingTree,
          sourceParameterMap,
          setSourceBodyDocument,
          setTargetBodyDocument,
        } = useDataMapper();
        useEffect(() => {
          setDebug(true);
          const sourceDoc = TestUtil.createSourceOrderDoc();
          setSourceBodyDocument(sourceDoc);
          const targetDoc = TestUtil.createTargetOrderDoc();
          setTargetBodyDocument(targetDoc);
          MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, mappingTree, sourceParameterMap);
          setMappingTree(mappingTree);
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        return <>{children}</>;
      };
      const mockLog = jest.fn();
      const mockDebug = jest.fn();
      console.log = mockLog;
      console.debug = mockDebug;
      render(
        <TestProviders>
          <TestLoader>
            <DebugLayout />
          </TestLoader>
        </TestProviders>,
      );
      await screen.findByTestId('dm-debug-main-menu-button');
      const connectionPortsLog = mockDebug.mock.calls.filter((call) => call[0].startsWith('Connection Ports: ['));
      expect(connectionPortsLog.length).toBeGreaterThan(0);
      const mappingsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Mapping: ['));
      expect(mappingsLog.length).toBeGreaterThan(0);
    });
  });
});
