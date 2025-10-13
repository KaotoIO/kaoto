import { DataMapperCanvasProvider } from './datamapper-canvas.provider';
import { render } from '@testing-library/react';
import { DataMapperProvider } from './datamapper.provider';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { SourceTargetView } from '../components/View/SourceTargetView';
import { useDataMapper } from '../hooks/useDataMapper';
import { useCanvas } from '../hooks/useCanvas';
import { BODY_DOCUMENT_ID, DocumentType } from '../models/datamapper/document';
import { screen } from '@testing-library/react';
import { TestUtil } from '../stubs/datamapper/data-mapper';

describe('CanvasProvider', () => {
  it('should render', async () => {
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <div data-testid="testdiv" />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(await screen.findByTestId('testdiv')).toBeInTheDocument();
  });

  it('should fail if not within DataMapperProvider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const thrower = () => {
      render(<DataMapperCanvasProvider></DataMapperCanvasProvider>);
    };
    expect(thrower).toThrow();
    consoleSpy.mockRestore();
  });

  it('clearNodeReferencesForPath() should clear for the path', async () => {
    let sourceReferencesCleared = false;
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
        const nodePaths = getAllNodePaths();
        if (
          !sourceReferencesCleared &&
          nodePaths.find((path) => path.includes(`sourceBody:${BODY_DOCUMENT_ID}://fx`))
        ) {
          beforeNodePaths = nodePaths;
          clearNodeReferencesForPath(`sourceBody:${BODY_DOCUMENT_ID}://`);
          afterNodePaths = getAllNodePaths();
          sourceReferencesCleared = true;
        }
      }, [clearNodeReferencesForPath, getAllNodePaths, reloadNodeReferences]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <LoadDocuments>
            <SourceTargetView></SourceTargetView>
          </LoadDocuments>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    await screen.findAllByText('ShipOrder');
    expect(afterNodePaths.length).toEqual(15);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
  });

  it('clearNodeReferencesForDocument() should clear for the Document', async () => {
    let sourceReferencesCleared = false;
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
        const nodePaths = getAllNodePaths();
        if (
          !sourceReferencesCleared &&
          nodePaths.find((path) => path.includes(`sourceBody:${BODY_DOCUMENT_ID}://fx`))
        ) {
          beforeNodePaths = nodePaths;
          clearNodeReferencesForDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);
          afterNodePaths = getAllNodePaths();
          sourceReferencesCleared = true;
        }
      }, [clearNodeReferencesForDocument, getAllNodePaths, reloadNodeReferences]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <LoadDocuments>
            <SourceTargetView></SourceTargetView>
          </LoadDocuments>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    await screen.findAllByText('ShipOrder');
    expect(afterNodePaths.length).toBeGreaterThan(10);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
  });
});
