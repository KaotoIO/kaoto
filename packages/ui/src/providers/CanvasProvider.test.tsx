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

describe('CanvasProvider', () => {
  it('should render', () => {
    render(
      <DataMapperProvider>
        <CanvasProvider></CanvasProvider>
      </DataMapperProvider>,
    );
  });

  it('clearNodeReferencesForPath() should clear for the path', () => {
    let first = false;
    let second = false;
    let beforeNodePaths: string[] = [];
    let afterNodePaths: string[] = [];
    const LoadDocument: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { setSourceBodyDocument, setTargetBodyDocument } = useDataMapper();
      const { clearNodeReferencesForPath, getAllNodePaths, reloadNodeReferences } = useCanvas();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        reloadNodeReferences();
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
          <LoadDocument>
            <SourceTargetView></SourceTargetView>
          </LoadDocument>
        </CanvasProvider>
      </DataMapperProvider>,
    );
    expect(afterNodePaths.length).toBeGreaterThan(10);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
  });

  it('clearNodeReferencesForDocument() should clear for the Document', () => {
    let first = false;
    let second = false;
    let beforeNodePaths: string[] = [];
    let afterNodePaths: string[] = [];
    const LoadDocument: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { setSourceBodyDocument, setTargetBodyDocument } = useDataMapper();
      const { clearNodeReferencesForDocument, getAllNodePaths, reloadNodeReferences } = useCanvas();
      useEffect(() => {
        const sourceDoc = TestUtil.createSourceOrderDoc();
        setSourceBodyDocument(sourceDoc);
        const targetDoc = TestUtil.createTargetOrderDoc();
        setTargetBodyDocument(targetDoc);
        reloadNodeReferences();
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
          <LoadDocument>
            <SourceTargetView></SourceTargetView>
          </LoadDocument>
        </CanvasProvider>
      </DataMapperProvider>,
    );
    expect(afterNodePaths.length).toBeGreaterThan(10);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
  });

  it('should fail if not within DataMapperProvider', () => {
    const thrower = () => {
      render(<CanvasProvider></CanvasProvider>);
    };
    expect(thrower).toThrow();
  });
});
