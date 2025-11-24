import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { PropsWithChildren } from 'react';

import { SourceTargetView } from '../components/View/SourceTargetView';
import { useCanvas } from '../hooks/useCanvas';
import { useDataMapper } from '../hooks/useDataMapper';
import { BODY_DOCUMENT_ID, DocumentType } from '../models/datamapper/document';
import { TestUtil } from '../stubs/datamapper/data-mapper';
import { DataMapperProvider } from './datamapper.provider';
import { DataMapperCanvasProvider } from './datamapper-canvas.provider';

describe('CanvasProvider', () => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <DataMapperProvider>
      <DataMapperCanvasProvider>
        <SourceTargetView />
        {children}
      </DataMapperCanvasProvider>
    </DataMapperProvider>
  );

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
    const { result } = renderHook(
      () => ({
        dataMapper: useDataMapper(),
        canvas: useCanvas(),
      }),
      { wrapper },
    );

    act(() => {
      const sourceDoc = TestUtil.createSourceOrderDoc();
      const targetDoc = TestUtil.createTargetOrderDoc();
      result.current.dataMapper.setSourceBodyDocument(sourceDoc);
      result.current.dataMapper.setTargetBodyDocument(targetDoc);
    });
    act(() => {
      result.current.canvas.reloadNodeReferences();
    });

    await waitFor(() => {
      const nodePaths = result.current.canvas.getAllNodePaths();
      expect(nodePaths.some((path) => path.includes(`sourceBody:${BODY_DOCUMENT_ID}://fx`))).toBe(true);
    });

    const beforeNodePaths = result.current.canvas.getAllNodePaths();

    result.current.canvas.clearNodeReferencesForPath(`sourceBody:${BODY_DOCUMENT_ID}://`);

    const afterNodePaths = result.current.canvas.getAllNodePaths();

    expect(afterNodePaths.length).toEqual(14);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
  });

  it('clearNodeReferencesForDocument() should clear for the Document', async () => {
    const { result } = renderHook(
      () => ({
        dataMapper: useDataMapper(),
        canvas: useCanvas(),
      }),
      { wrapper },
    );

    act(() => {
      const sourceDoc = TestUtil.createSourceOrderDoc();
      const targetDoc = TestUtil.createTargetOrderDoc();
      result.current.dataMapper.setSourceBodyDocument(sourceDoc);
      result.current.dataMapper.setTargetBodyDocument(targetDoc);
    });
    act(() => {
      result.current.canvas.reloadNodeReferences();
    });

    await waitFor(() => {
      const nodePaths = result.current.canvas.getAllNodePaths();
      expect(nodePaths.some((path) => path.includes(`sourceBody:${BODY_DOCUMENT_ID}://fx`))).toBe(true);
    });

    const beforeNodePaths = result.current.canvas.getAllNodePaths();

    result.current.canvas.clearNodeReferencesForDocument(DocumentType.SOURCE_BODY, BODY_DOCUMENT_ID);

    const afterNodePaths = result.current.canvas.getAllNodePaths();

    expect(afterNodePaths.length).toBeGreaterThan(10);
    expect(beforeNodePaths.length).toBeGreaterThan(afterNodePaths.length);
  });
});
