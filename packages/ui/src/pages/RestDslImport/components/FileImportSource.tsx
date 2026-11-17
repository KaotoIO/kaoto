import { FileUploaderDropContainer, FileUploaderItem, InlineNotification } from '@carbon/react';
import { FunctionComponent, SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';

import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { SchemaLoadedResult } from '../RestDslImportTypes';

type FileImportSourceProps = {
  onSchemaLoaded: (result: SchemaLoadedResult) => { error?: string };
  /** Called when the user removes the file, so what was derived from it is discarded */
  onCleared?: () => void;
  /** Name of a file already loaded by the wizard, shown again when the step is revisited */
  loadedFilename?: string;
};

type AddedFile = File & { invalidFileType?: boolean };

const ACCEPTED_EXTENSIONS = ['.json', '.yaml', '.yml'];
const READ_ERROR_MESSAGE = 'Unable to read the uploaded specification.';
const UNSUPPORTED_FILE_MESSAGE = `Unsupported file type. Accepted types: ${ACCEPTED_EXTENSIONS.join(', ')}.`;

export const FileImportSource: FunctionComponent<FileImportSourceProps> = ({
  onSchemaLoaded,
  onCleared,
  loadedFilename = '',
}) => {
  const [filename, setFilename] = useState(loadedFilename);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(!!loadedFilename);
  const [error, setError] = useState('');
  const uploaderRef = useRef<HTMLButtonElement>(null);
  const focusUploaderRef = useRef(false);
  const startRequest = useLatestRequest();

  /** The remove button is gone once the file is removed, so focus moves to the uploader that replaces it */
  useEffect(() => {
    if (!filename && focusUploaderRef.current) {
      focusUploaderRef.current = false;
      uploaderRef.current?.focus();
    }
  }, [filename]);

  const loadFile = useCallback(
    async (file: AddedFile) => {
      const name = file.name;
      const isLatest = startRequest();
      setFilename(name);
      setError('');
      setIsLoaded(false);

      if (file.invalidFileType) {
        setError(UNSUPPORTED_FILE_MESSAGE);
        return;
      }

      setIsLoading(true);
      try {
        const content = await file.text();
        if (!isLatest()) return;
        if (!content) {
          setError('No file content to load');
          return;
        }

        const loadResult = onSchemaLoaded({ schema: content, source: 'file', sourceIdentifier: name });
        if (loadResult?.error) {
          setError(loadResult.error);
        } else {
          setIsLoaded(true);
        }
      } catch (err) {
        if (isLatest()) {
          setError(err instanceof Error ? err.message : READ_ERROR_MESSAGE);
        }
      } finally {
        if (isLatest()) {
          setIsLoading(false);
        }
      }
    },
    [startRequest, onSchemaLoaded],
  );

  const handleAddFiles = useCallback(
    (event: SyntheticEvent, { addedFiles }: { addedFiles: AddedFile[] }) => {
      const file = addedFiles[0];
      if (file) {
        void loadFile(file);
        return;
      }

      // The uploader drops a file without an extension before it reports it as unsupported.
      // Cancelling the file picker adds no files and selects none, so it stays silent.
      const isDrop = event.type === 'drop';
      const pickedFiles = (event.target as HTMLInputElement).files?.length ?? 0;
      if (isDrop || pickedFiles > 0) {
        setError(UNSUPPORTED_FILE_MESSAGE);
      }
    },
    [loadFile],
  );

  const handleDelete = useCallback(() => {
    focusUploaderRef.current = true;
    setFilename('');
    setIsLoaded(false);
    setError('');
    onCleared?.();
  }, [onCleared]);

  return (
    <>
      {filename ? (
        <FileUploaderItem
          name={filename}
          status={isLoading ? 'uploading' : 'edit'}
          iconDescription="Remove file"
          invalid={!!error}
          errorSubject={error}
          onDelete={handleDelete}
        />
      ) : (
        <>
          <p className="rest-dsl-import-helper">Supported file types are .json, .yaml and .yml.</p>
          <FileUploaderDropContainer
            name="openapi-file-upload"
            labelText="Drag and drop files here or click to upload"
            accept={ACCEPTED_EXTENSIONS}
            multiple={false}
            innerRef={uploaderRef}
            onAddFiles={handleAddFiles}
          />
          {error && <InlineNotification kind="error" lowContrast hideCloseButton role="alert" title={error} />}
        </>
      )}
      {isLoaded && <InlineNotification kind="success" lowContrast hideCloseButton title="Schema loaded successfully" />}
    </>
  );
};
