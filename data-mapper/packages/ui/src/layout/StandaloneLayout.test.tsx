import { DataMapperProvider } from '../providers';
import { CanvasProvider } from '../providers/CanvasProvider';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StandaloneLayout } from './StandaloneLayout';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { useDataMapper } from '../hooks';
import { useCanvas } from '../hooks/useCanvas';
import { TestUtil } from '../test/test-util';
import { MappingSerializerService } from '../services/mapping-serializer.service';
import { MappingTree } from '../models/mapping';

describe('MainLayout', () => {
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
      render(
        <DataMapperProvider>
          <CanvasProvider>
            <TestLoader>
              <StandaloneLayout />
            </TestLoader>
          </CanvasProvider>
        </DataMapperProvider>,
      );
      let mainMenuButton = screen.getByTestId('main-menu-button');
      act(() => {
        fireEvent.click(mainMenuButton);
      });
      const importButton = screen.getByTestId('import-mappings-button');
      act(() => {
        fireEvent.click(importButton);
      });
      const fileContent = new File([new Blob([TestUtil.shipOrderToShipOrderXslt])], 'ShipOrderToShipOrder.xsl', {
        type: 'text/plain',
      });
      const fileInput = screen.getByTestId('import-mappings-file-input');
      expect(spyOnMappingTree!.children.length).toBe(0);
      act(() => {
        fireEvent.change(fileInput, { target: { files: { item: () => fileContent, length: 1, 0: fileContent } } });
      });
      await waitFor(() => expect(spyOnMappingTree!.children.length).toBe(1));

      mainMenuButton = screen.getByTestId('main-menu-button');
      act(() => {
        fireEvent.click(mainMenuButton);
      });
      const exportButton = screen.getByTestId('export-mappings-button');
      act(() => {
        fireEvent.click(exportButton.getElementsByTagName('button')[0]);
      });
      const modal = await screen.findAllByTestId('export-mappings-modal');
      expect(modal).toBeTruthy();
      const closeModalButton = screen.getByTestId('export-mappings-modal-close-btn');
      act(() => {
        fireEvent.click(closeModalButton);
      });
      expect(screen.queryByTestId('export-mappings-modal')).toBeFalsy();
    });
  });

  describe('debug', () => {
    it('should output debug info to console', () => {
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
          MappingSerializerService.deserialize(
            TestUtil.shipOrderToShipOrderXslt,
            targetDoc,
            mappingTree,
            sourceParameterMap,
          );
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
          <CanvasProvider>
            <TestLoader>
              <StandaloneLayout />
            </TestLoader>
          </CanvasProvider>
        </DataMapperProvider>,
      );
      const nodeRefsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Node References: ['));
      expect(nodeRefsLog.length).toBeGreaterThan(0);
      const mappingsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Mapping: ['));
      expect(mappingsLog.length).toBeGreaterThan(0);
    });
  });
});
