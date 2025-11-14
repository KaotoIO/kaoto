import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DebugLayout } from './DebugLayout';
import { FunctionComponent, MutableRefObject, PropsWithChildren, useEffect } from 'react';
import { useDataMapper } from '../../../hooks/useDataMapper';
import { useCanvas } from '../../../hooks/useCanvas';
import { MappingSerializerService } from '../../../services/mapping-serializer.service';
import { MappingTree } from '../../../models/datamapper/mapping';
import { shipOrderToShipOrderXslt, TestUtil } from '../../../stubs/datamapper/data-mapper';
import { IMappingLink, NodeReference } from '../../../models/datamapper/visualization';
import { useMappingLinks } from '../../../hooks/useMappingLinks';
import { MappingLinksService } from '../../../services/mapping-links.service';

describe('DebugLayout', () => {
  afterAll(() => {
    jest.resetModules();
    jest.resetAllMocks();
  });

  it('should render Documents and mappings', async () => {
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
      const { getAllNodePaths, reloadNodeReferences } = useCanvas();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, mappingTree, sourceParameterMap);
        setMappingTree(mappingTree);
        reloadNodeReferences();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        mappingLinks = MappingLinksService.extractMappingLinks(mappingTree, sourceParameterMap, sourceBodyDocument);
      }, [getAllNodePaths, mappingTree, sourceBodyDocument, sourceParameterMap]);
      return <>{children}</>;
    };
    const mockLog = jest.fn();
    console.log = mockLog;
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <LoadMappings>
            <DebugLayout></DebugLayout>
          </LoadMappings>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    await screen.findAllByText('ShipOrder');
    const targetDocuments = screen.queryAllByTestId(/^document-doc-targetBody-.*/);
    const targetFields = screen.queryAllByTestId(/^node-target-.*/);
    const targetNodes = [...targetDocuments, ...targetFields];
    expect(targetNodes.length).toEqual(21);
    expect(mappingLinks.length).toEqual(11);
    expect(mappingLinks.filter((link) => link.isSelected).length).toEqual(0);
    const nodeRefsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Node References: ['));
    expect(nodeRefsLog.length).toBeGreaterThan(0);
  });

  it('should register selected node reference', async () => {
    let selectedNodeReference: MutableRefObject<NodeReference> | null = null;
    const LoadMappings: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { mappingTree, setMappingTree, sourceParameterMap, setSourceBodyDocument, setTargetBodyDocument } =
        useDataMapper();
      const { reloadNodeReferences } = useCanvas();
      const { getSelectedNodeReference } = useMappingLinks();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, mappingTree, sourceParameterMap);
        setMappingTree(mappingTree);
        reloadNodeReferences();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        selectedNodeReference = getSelectedNodeReference();
      }, [getSelectedNodeReference]);
      return <>{children}</>;
    };
    console.log = jest.fn();
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <LoadMappings>
            <DebugLayout />
          </LoadMappings>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    const targetOrderId = await screen.findByTestId(/node-target-fx-OrderId-.*/);
    act(() => {
      fireEvent.click(targetOrderId);
    });
    await waitFor(() => {
      expect(selectedNodeReference?.current.path).toMatch(/targetBody:Body:\/\/fx-ShipOrder-.*\/fx-OrderId-.*/);
    });

    const sourceOrderId = await screen.findByTestId(/node-source-fx-OrderId-.*/);
    act(() => {
      fireEvent.click(sourceOrderId);
    });
    await waitFor(() => {
      expect(selectedNodeReference?.current.path).toMatch(/sourceBody:Body:\/\/fx-ShipOrder-.*\/fx-OrderId-.*/);
    });
  });

  describe('Main Menu', () => {
    it('should import and export mappings', async () => {
      let spyOnMappingTree: MappingTree;
      const TestLoader: FunctionComponent<PropsWithChildren> = ({ children }) => {
        const { mappingTree, setSourceBodyDocument, setTargetBodyDocument } = useDataMapper();
        const { reloadNodeReferences } = useCanvas();
        useEffect(() => {
          const sourceDoc = TestUtil.createSourceOrderDoc();
          setSourceBodyDocument(sourceDoc);
          const targetDoc = TestUtil.createTargetOrderDoc();
          setTargetBodyDocument(targetDoc);
          reloadNodeReferences();
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        useEffect(() => {
          spyOnMappingTree = mappingTree;
        }, [mappingTree]);
        return <>{children}</>;
      };
      const mockLog = jest.fn();
      console.log = mockLog;
      render(
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <TestLoader>
              <DebugLayout />
            </TestLoader>
          </DataMapperCanvasProvider>
        </DataMapperProvider>,
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
      const nodeRefsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Node References: ['));
      expect(nodeRefsLog.length).toBeGreaterThan(0);
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
        const { reloadNodeReferences } = useCanvas();
        useEffect(() => {
          setDebug(true);
          const sourceDoc = TestUtil.createSourceOrderDoc();
          setSourceBodyDocument(sourceDoc);
          const targetDoc = TestUtil.createTargetOrderDoc();
          setTargetBodyDocument(targetDoc);
          MappingSerializerService.deserialize(shipOrderToShipOrderXslt, targetDoc, mappingTree, sourceParameterMap);
          setMappingTree(mappingTree);
          reloadNodeReferences();
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);
        return <>{children}</>;
      };
      const mockLog = jest.fn();
      console.log = mockLog;
      render(
        <DataMapperProvider>
          <DataMapperCanvasProvider>
            <TestLoader>
              <DebugLayout />
            </TestLoader>
          </DataMapperCanvasProvider>
        </DataMapperProvider>,
      );
      await screen.findByTestId('dm-debug-main-menu-button');
      const nodeRefsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Node References: ['));
      expect(nodeRefsLog.length).toBeGreaterThan(0);
      const mappingsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Mapping: ['));
      expect(mappingsLog.length).toBeGreaterThan(0);
    });
  });
});
