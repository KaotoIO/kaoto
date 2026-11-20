import { RouteVisualization, RouteVisualizationView } from '@kaoto/kaoto/components';
import { FunctionComponent, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { CATALOG_URL } from '../../../catalog-url';
import { EditorHistoryContext } from '../../../context/EditorHistoryContextDefinition';
import { StoredFile } from '../../../services/files/stored-file';
import { createFileSourceCodeAdapter } from './file-source-code-adapter';

interface RouteFileEditorProps {
  file: Pick<StoredFile, 'id' | 'path' | 'content'>;
  view: RouteVisualizationView;
  onSave: (fileId: string, code: string) => void;
}

/**
 * Edits a route file on the canvas and as code.
 *
 * It stays mounted across route files: re-mounting would tear down the providers inside RouteVisualization and
 * download the whole Camel catalog again. The adapter delivers the next file instead.
 */
export const RouteFileEditor: FunctionComponent<RouteFileEditorProps> = ({ file, view, onSave }) => {
  const [adapter] = useState(() => {
    const fileAdapter = createFileSourceCodeAdapter();
    fileAdapter.open(file);
    return fileAdapter;
  });
  // Before the editor can report a change
  useLayoutEffect(() => {
    adapter.setSave(onSave);
  }, [adapter, onSave]);

  // Only another file is delivered; the stored content of the open file follows the editor, not the other way round
  const openedFileIdRef = useRef(file.id);
  useEffect(() => {
    if (openedFileIdRef.current === file.id) return;
    openedFileIdRef.current = file.id;
    adapter.open(file);
  }, [adapter, file]);

  const setHistory = useContext(EditorHistoryContext)?.setHistory;
  useEffect(() => () => setHistory?.(undefined), [setHistory]);

  return (
    <RouteVisualization
      className="cs--integration-shell__canvas"
      catalogUrl={CATALOG_URL}
      runtimeCatalogName=""
      testingCatalogName=""
      adapter={adapter}
      view={view}
      onUndoRedoChange={setHistory}
    />
  );
};
