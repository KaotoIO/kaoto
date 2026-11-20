// PatternFly styles for the RouteVisualization canvas; the no-reset variant leaves Carbon's reset untouched
import '@patternfly/react-core/dist/styles/base-no-reset.css';
import './IntegrationShell.scss';

import { InlineNotification } from '@carbon/react';
import { FunctionComponent, useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { LoadingState } from '../../components/LoadingState/LoadingState';
import { useIntegrationHeader } from '../../context/IntegrationHeaderContext';
import { useActiveFile } from '../../hooks/useActiveFile';
import { getFileType } from '../../services/files/stored-file';
import { useFilesUiStore, useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { editorKindFor } from './editors/editor-registry';
import { EditorHeader } from './editors/EditorHeader';
import { RouteFileEditor } from './editors/RouteFileEditor';
import { TextFileEditor } from './editors/TextFileEditor';
import { viewIconFor } from './editors/view-icon';
import { useOpenFile } from './useOpenFile';
import { useOpenFileContent } from './useOpenFileContent';

const WORKSPACE_PATH = '/workspace';

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)));

/**
 * IntegrationShell — rendered at `/workspace/file/*`, where the rest of the URL is the path of the open file.
 *
 * The host of the editors: reads the content of the open file from the files store, shows it in the editor of its type
 * (routes on the canvas and as code, other files as text) and writes the edits back. Keeps the URL on the open file
 * when it moves and leaves it when it is removed. Publishes the breadcrumb into IntegrationHeaderContext so the Nav
 * header shows the full file path. View mode switcher (Design/Code) is rendered by ProjectToolbar.
 */
const IntegrationShell: FunctionComponent = () => {
  const header = useIntegrationHeader();
  const { path } = useActiveFile();
  const status = useFilesUiStore((state) => state.status);
  const store = useFilesUiStoreApi();
  const openFile = useOpenFile();
  const openEditorKind = openFile && editorKindFor(getFileType(openFile.path));
  const { shown, error: readError } = useOpenFileContent(openFile, openEditorKind);
  /** Tagged with its file, so that it is not shown for another file */
  const [saveError, setSaveError] = useState<{ key: string; error: Error }>();
  /** The content last written for a file; the shown content stays the one read when the file opened */
  const [stored, setStored] = useState<{ key: string; content: string }>();

  // Reset view mode to Design when opening a different file — not when the files change or the file moves.
  const openKey = openFile?.key;
  useEffect(() => {
    if (openKey === undefined || !header) return;
    header.setViewMode('design');
    // `header` is a stable context reference (never changes identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey]);

  // Names the shown file; stays empty while nothing is shown
  const shownPath = shown?.path;
  useEffect(() => {
    if (!header) return;
    const segments = shownPath?.split('/') ?? [];
    header.setBreadcrumbItems(segments.slice(0, -1).map((label) => ({ label, href: WORKSPACE_PATH })));
    header.setCurrent(segments.at(-1) ?? '');
    return () => {
      header.setBreadcrumbItems([]);
      header.setCurrent('');
    };
    // `header` is a stable context reference (never changes identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownPath]);

  if (path === undefined) return <Navigate to={WORKSPACE_PATH} replace />;

  const storeCode = (key: string, code: string) => {
    store
      .getState()
      .setFileContent(key, code)
      .then(
        () => {
          setStored({ key, content: code });
          setSaveError(undefined);
        },
        (error: unknown) => {
          setSaveError({ key, error: toError(error) });
        },
      );
  };
  const currentSaveError = shown && saveError?.key === shown.key ? saveError.error : undefined;

  const viewMode = header?.viewMode ?? 'design';
  const editorKind = shown && editorKindFor(getFileType(shown.path));

  let body;
  if (shown && editorKind === 'text') {
    body = <TextFileEditor key={shown.key} file={shown} onSave={storeCode} />;
  } else if (shown && editorKind) {
    body = <RouteFileEditor file={shown} view={viewMode} onSave={storeCode} />;
  } else if (readError) {
    body = <p className="cs--integration-shell__empty">{`The file could not be read (${readError.message})`}</p>;
  } else if (status !== 'loading' && !openFile) {
    body = <p className="cs--integration-shell__empty">The file does not exist</p>;
  } else {
    body = (
      <div className="cs--integration-shell__loading">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="cs--integration-shell" data-testid="integration-shell">
      {shown && editorKind && (
        <EditorHeader
          icon={viewIconFor(editorKind, viewMode)}
          path={shown.path}
          content={stored?.key === shown.key ? stored.content : shown.content}
        />
      )}
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
