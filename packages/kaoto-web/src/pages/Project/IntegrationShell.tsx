// PatternFly styles for the RouteVisualization canvas; the no-reset variant leaves Carbon's reset untouched
import '@patternfly/react-core/dist/styles/base-no-reset.css';
import './IntegrationShell.scss';

import { InlineNotification } from '@carbon/react';
import { RouteVisualization } from '@kaoto/kaoto/components';
import { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router';

import { CATALOG_URL } from '../../catalog-url';
import { buildTree } from '../../components/Explorer/build-tree';
import { findPath } from '../../components/Explorer/filterFiles';
import { LoadingState } from '../../components/LoadingState/LoadingState';
import { useIntegrationHeader } from '../../context/IntegrationHeaderContext';
import { useFiles } from '../../hooks/useFiles';
import { useSafeParams } from '../../hooks/useSafeParams';
import { getFileType } from '../../services/files/stored-file';
import { editorKindFor } from './editors/editor-registry';
import { TextFileEditor } from './editors/TextFileEditor';

const WORKSPACE_PATH = '/workspace';

/**
 * Edits the code of the open file, starting from its stored content.
 *
 * The canvas stays mounted across files: re-mounting it would tear down the providers inside RouteVisualization and
 * download the whole Camel catalog again. The local code is reset instead.
 */
const IntegrationCanvas: FunctionComponent<{
  fileId: string;
  initialCode: string;
  onCodeChange: (code: string) => void;
}> = ({ fileId, initialCode, onCodeChange }) => {
  const [code, setCode] = useState(initialCode);
  const [codeOwner, setCodeOwner] = useState(fileId);
  if (codeOwner !== fileId) {
    // Adjust state while rendering (https://react.dev/learn/you-might-not-need-an-effect)
    setCodeOwner(fileId);
    setCode(initialCode);
  }

  const handleCodeChange = (newCode: string) => {
    // The canvas also reports the code it was given, which needs no write
    if (newCode === code) return;
    setCode(newCode);
    onCodeChange(newCode);
  };

  return (
    <RouteVisualization
      className="cs--integration-shell__canvas"
      catalogUrl={CATALOG_URL}
      runtimeCatalogName=""
      testingCatalogName=""
      code={code}
      codeChange={handleCodeChange}
    />
  );
};

/**
 * IntegrationShell — rendered at `/workspace/file/:fileId`.
 *
 * Shows the stored file on the canvas and writes the edits back to the store. Publishes the breadcrumb into
 * IntegrationHeaderContext so the Nav header shows the full file path. View mode switcher (Design/Code/Topology) is
 * rendered by ProjectToolbar.
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

  const isDesignMode = (header?.viewMode ?? 'design') === 'design';

  let body;
  if (loading) {
    body = <LoadingState />;
  } else if (!file) {
    body = <p className="cs--integration-shell__empty">The file does not exist</p>;
  } else if (editorKindFor(getFileType(file.path)) === 'text') {
    body = <TextFileEditor key={file.id} file={file} onSave={storeCode} />;
  } else if (isDesignMode) {
    const fileId = file.id;
    body = (
      <IntegrationCanvas
        fileId={fileId}
        initialCode={file.content}
        onCodeChange={(code) => {
          storeCode(fileId, code);
        }}
      />
    );
  }

  return (
    <div className="cs--integration-shell" data-testid="integration-shell">
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
