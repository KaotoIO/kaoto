import { RouteVisualization } from '@kaoto/kaoto/components';
import { FunctionComponent, useState } from 'react';

import { CATALOG_URL } from '../../../catalog-url';
import { ViewMode } from '../../../context/IntegrationHeaderContext';
import { StoredFile } from '../../../services/files/stored-file';
import { CodeEditor } from './CodeEditor';
import { useDebouncedSave } from './use-debounced-save';

type RouteFile = Pick<StoredFile, 'id' | 'path' | 'content'>;

interface RouteFileEditorProps {
  file: RouteFile;
  view: ViewMode;
  onSave: (fileId: string, code: string) => void;
}

/** The code of a route and the file it belongs to, so that a late save of one file cannot land in another */
interface RouteCode {
  fileId: string;
  code: string;
}

/**
 * The code view of a route: Monaco, saved once typing pauses.
 *
 * It is mounted only while the code view is shown, once per file (`key`). Leaving the view or the file unmounts it,
 * which hands a pending edit over right away, so the canvas never shows an older state.
 */
const RouteCodeView: FunctionComponent<{
  file: RouteFile;
  initialCode: string;
  onCommit: (fileId: string, code: string) => void;
}> = ({ file, initialCode, onCommit }) => {
  const { schedule } = useDebouncedSave(onCommit);

  const handleChange = (code: string) => {
    schedule(file.id, code);
  };

  // The hidden canvas keeps listening to Delete and Backspace on the page: keys belong in the editor here
  return <CodeEditor path={file.path} initialContent={initialCode} onChange={handleChange} focusOnMount />;
};

/**
 * Edits a route file on the canvas (Design) and as code (Code).
 *
 * The canvas stays mounted in every view and across files, hidden outside Design: re-mounting it would tear down the
 * providers inside RouteVisualization and download the whole Camel catalog again. Both views share the code of the
 * open file; edits from either side are saved.
 */
export const RouteFileEditor: FunctionComponent<RouteFileEditorProps> = ({ file, view, onSave }) => {
  const [routeCode, setRouteCode] = useState<RouteCode>({ fileId: file.id, code: file.content });
  if (routeCode.fileId !== file.id) {
    // Adjust state while rendering (https://react.dev/learn/you-might-not-need-an-effect)
    setRouteCode({ fileId: file.id, code: file.content });
  }
  const { code } = routeCode;

  const handleCanvasChange = (newCode: string) => {
    // The canvas also reports the code it was given, which needs no write
    if (newCode === code) return;
    setRouteCode({ fileId: file.id, code: newCode });
    onSave(file.id, newCode);
  };

  const handleCodeCommit = (fileId: string, newCode: string) => {
    // A pending edit can arrive after another file opened: it is saved, but the canvas keeps the open file
    setRouteCode((current) => (current.fileId === fileId ? { fileId, code: newCode } : current));
    onSave(fileId, newCode);
  };

  return (
    <>
      <div className="cs--integration-shell__design" hidden={view !== 'design'}>
        <RouteVisualization
          className="cs--integration-shell__canvas"
          catalogUrl={CATALOG_URL}
          runtimeCatalogName=""
          testingCatalogName=""
          code={code}
          codeChange={handleCanvasChange}
        />
      </div>
      {view === 'code' && <RouteCodeView key={file.id} file={file} initialCode={code} onCommit={handleCodeCommit} />}
    </>
  );
};
