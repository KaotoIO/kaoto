import { CanvasProvider } from './CanvasProvider';
import { render } from '@testing-library/react';
import { DataMapperProvider } from './DataMapperProvider';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { SourceTargetView } from '../layout/views';
import { useDataMapper } from '../hooks';
import { DocumentType } from '../models/path';
import { TestUtil } from '../test/test-util';
import { useCanvas } from '../hooks/useCanvas';
import { BODY_DOCUMENT_ID } from '../models/document';
import { MappingSerializerService } from '../services/mapping-serializer.service';
import { screen } from '@testing-library/react';
import { StandaloneLayout } from '../layout';
import { MappingService } from '../services/mapping.service';
import { IMappingLink } from '../models/visualization';

describe('CanvasProvider', () => {
  it('should render', () => {
    render(
      <DataMapperProvider>
        <CanvasProvider></CanvasProvider>
      </DataMapperProvider>,
    );
  });

  it('should fail if not within DataMapperProvider', () => {
    const thrower = () => {
      render(<CanvasProvider></CanvasProvider>);
    };
    expect(thrower).toThrow();
  });

  it('clearNodeReferencesForPath() should clear for the path', async () => {
    let first = false;
    let second = false;
    let beforeNodePaths: string[] = [];
    let afterNodePaths: string[] = [];
    const LoadDocuments: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { setSourceBodyDocument, setTargetBodyDocument } = useDataMapper();
      const { clearNodeReferencesForPath, getAllNodePaths, reloadNodeReferences } = useCanvas();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        reloadNodeReferences();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        if (!first) {
          first = true;
          return;
        }
        if (!second) {
          second = true;
          beforeNodePaths = getAllNodePaths();
          clearNodeReferencesForPath('sourceBody:ShipOrder.xsd://');
          afterNodePaths = getAllNodePaths();
        }
      }, [clearNodeReferencesForPath, getAllNodePaths, reloadNodeReferences]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <LoadDocuments>
            <SourceTargetView></SourceTargetView>
          </LoadDocuments>
        </CanvasProvider>
      </DataMapperProvider>,
    );
    await screen.findAllByText('ShipOrder');
    expect(afterNodePaths.length).toBeGreaterThan(10);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
  });

  it('clearNodeReferencesForDocument() should clear for the Document', async () => {
    let first = false;
    let second = false;
    let beforeNodePaths: string[] = [];
    let afterNodePaths: string[] = [];
    const LoadDocuments: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { setSourceBodyDocument, setTargetBodyDocument } = useDataMapper();
      const { clearNodeReferencesForDocument, getAllNodePaths, reloadNodeReferences } = useCanvas();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        reloadNodeReferences();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        if (!first) {
          first = true;
          return;
        }
        if (!second) {
          second = true;
          beforeNodePaths = getAllNodePaths();
          clearNodeReferencesForDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
          afterNodePaths = getAllNodePaths();
        }
      }, [clearNodeReferencesForDocument, getAllNodePaths, reloadNodeReferences]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <LoadDocuments>
            <SourceTargetView></SourceTargetView>
          </LoadDocuments>
        </CanvasProvider>
      </DataMapperProvider>,
    );
    await screen.findAllByText('ShipOrder');
    expect(afterNodePaths.length).toBeGreaterThan(10);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
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
      useEffect(() => {
        mappingLinks = MappingService.extractMappingLinks(mappingTree, sourceParameterMap, sourceBodyDocument);
      }, [getAllNodePaths, mappingTree, sourceBodyDocument, sourceParameterMap]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <LoadMappings>
            <StandaloneLayout></StandaloneLayout>
          </LoadMappings>
        </CanvasProvider>
      </DataMapperProvider>,
    );
    await screen.findAllByText('ShipOrder');
    const targetNodes = screen.getAllByTestId(/node-target-.*/);
    expect(targetNodes.length).toBeGreaterThan(10);
    expect(mappingLinks.length).toBeGreaterThan(10);
  });
});
