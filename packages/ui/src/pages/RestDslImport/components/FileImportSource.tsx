import { DropEvent, FileUpload, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useRef, useState } from 'react';

import { SchemaLoadedResult } from '../RestDslImportTypes';

type FileImportSourceProps = {
  onSchemaLoaded: (result: SchemaLoadedResult) => void;
};

export const FileImportSource: FunctionComponent<FileImportSourceProps> = ({ onSchemaLoaded }) => {
  const [value, setValue] = useState('');
  const [filename, setFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState('');
  const filenameRef = useRef('');

  const handleFileInputChange = useCallback((_: DropEvent, file: File) => {
    setFilename(file.name);
    filenameRef.current = file.name;
    setError('');
  }, []);

  const handleDataChange = useCallback(
    (_event: DropEvent, fileContent: string) => {
      setValue(fileContent);

      if (!fileContent) {
        setError('No file content to load');
        setIsLoaded(false);
        return;
      }

      try {
        onSchemaLoaded({
          schema: fileContent,
          source: 'file',
          sourceIdentifier: filenameRef.current || 'uploaded-file',
        });
        setIsLoaded(true);
        setError('');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to read the uploaded specification.';
        setError(message);
        setIsLoaded(false);
      }
    },
    [onSchemaLoaded],
  );

  const handleTextChange = useCallback((_event: React.ChangeEvent<HTMLTextAreaElement>, textValue: string) => {
    setValue(textValue);
  }, []);

  const handleClear = useCallback(() => {
    setFilename('');
    filenameRef.current = '';
    setValue('');
    setIsLoaded(false);
    setError('');
  }, []);

  const handleFileReadStarted = useCallback(() => {
    setIsLoading(true);
    setError('');
  }, []);

  const handleFileReadFinished = useCallback(() => {
    setIsLoading(false);
  }, []);

  return (
    <>
      <FileUpload
        id="openapi-file-upload"
        type="text"
        value={value}
        filename={filename}
        filenamePlaceholder="Drag and drop a file or upload one"
        onFileInputChange={handleFileInputChange}
        onDataChange={handleDataChange}
        onTextChange={handleTextChange}
        onReadStarted={handleFileReadStarted}
        onReadFinished={handleFileReadFinished}
        onClearClick={handleClear}
        isLoading={isLoading}
        browseButtonText="Upload"
        dropzoneProps={{
          accept: {
            'application/json': ['.json'],
            'application/x-yaml': ['.yaml', '.yml'],
            'text/yaml': ['.yaml', '.yml'],
          },
        }}
      />
      {isLoaded && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="success" icon={<CheckCircleIcon />}>
              Schema loaded successfully
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
      {error && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error">{error}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </>
  );
};
