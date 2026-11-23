// PatternFly styles for the RouteVisualization canvas; the no-reset variant leaves Carbon's reset untouched
import '@patternfly/react-core/dist/styles/base-no-reset.css';
import './IntegrationShell.scss';

import { InlineNotification } from '@carbon/react';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';

import { buildTree } from '../../components/Explorer/build-tree';
import { findPath } from '../../components/Explorer/filterFiles';
import { LoadingState } from '../../components/LoadingState/LoadingState';
import { useIntegrationHeader } from '../../context/IntegrationHeaderContext';
import { useFiles } from '../../hooks/useFiles';
import { useSafeParams } from '../../hooks/useSafeParams';
import { getFileType } from '../../services/files/stored-file';
import { editorKindFor } from './editors/editor-registry';
import { EditorHeader } from './editors/EditorHeader';
import { RouteFileEditor } from './editors/RouteFileEditor';
import { TextFileEditor } from './editors/TextFileEditor';
import { viewIconFor } from './editors/view-icon';

const WORKSPACE_PATH = '/workspace';

/**
 * IntegrationShell — rendered at `/workspace/file/:fileId`.
 *
 * Shows the stored file in the editor of its type (routes on the canvas and as code, other files as text) and writes
 * the edits back to the store. Publishes the breadcrumb into IntegrationHeaderContext so the Nav header shows the full
 * file path. View mode switcher (Design/Code/Topology) is rendered by ProjectToolbar.
 */
const IntegrationShell: FunctionComponent = () => {
  const params = useSafeParams(['fileId']);
  const header = useIntegrationHeader();

  const { files, loading, updateFile } = useFiles();
  const tree = useMemo(() => buildTree(files), [files]);
  const file = params ? files.find((candidate) => candidate.id === params.fileId) : undefined;
  /** Tagged with its file, so that it is not shown for another file */
  const [saveError, setSaveError] = useState<{ fileId: string; error: Error }>();

  // Reset view mode to Design when opening a different file — not when the files change.
  useEffect(() => {
    if (!params || !header) return;
    header.setViewMode('design');
    // `header` is a stable context reference (never changes identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.fileId]);

  // Stays empty while the files are loading or when the file does not exist.
  useEffect(() => {
    if (!params || !header) return;
    const path = findPath(tree, params.fileId);
    header.setBreadcrumbItems(
      path ? path.slice(0, -1).map((node) => ({ label: node.name, href: WORKSPACE_PATH })) : [],
    );
    header.setCurrent(path ? path[path.length - 1].name : '');
    return () => {
      header.setBreadcrumbItems([]);
      header.setCurrent('');
    };
    // `header` is a stable context reference (never changes identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.fileId, tree]);

  if (!params) return <Navigate to={WORKSPACE_PATH} replace />;

  const storeCode = (fileId: string, code: string) => {
    updateFile(fileId, code).then(
      () => {
        setSaveError(undefined);
      },
      (error: unknown) => {
        setSaveError({ fileId, error: error instanceof Error ? error : new Error(String(error)) });
      },
    );
  };
  const currentSaveError = saveError?.fileId === params.fileId ? saveError.error : undefined;

  const viewMode = header?.viewMode ?? 'design';
  const openFile = loading ? undefined : file;
  const editorKind = openFile && editorKindFor(getFileType(openFile.path));

  let body;
  if (loading) {
    body = <LoadingState />;
  } else if (!openFile || !editorKind) {
    body = <p className="cs--integration-shell__empty">The file does not exist</p>;
  } else if (editorKind === 'text') {
    body = <TextFileEditor key={openFile.id} file={openFile} onSave={storeCode} />;
  } else {
    body = <RouteFileEditor file={openFile} view={viewMode} onSave={storeCode} />;
  }

  return (
    <div className="cs--integration-shell" data-testid="integration-shell">
      {openFile && editorKind && <EditorHeader icon={viewIconFor(editorKind, viewMode)} path={openFile.path} />}
      {currentSaveError && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Could not save the file"
          subtitle={currentSaveError.message}
          onClose={() => {
            setSaveError(undefined);
          }}
          data-testid="integration-save-error"
        />
      )}
      <div className="cs--integration-shell__body" data-testid="integration-body">
        {body}
      </div>
    </div>
  );
};

export default IntegrationShell;
