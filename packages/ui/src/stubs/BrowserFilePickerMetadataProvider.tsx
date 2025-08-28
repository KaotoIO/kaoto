import { ChangeEvent, createRef, FunctionComponent, PropsWithChildren, useCallback, useRef } from 'react';
import {
  SCHEMA_FILE_ACCEPT_PATTERN,
  SCHEMA_FILE_ACCEPT_PATTERN_SOURCE_BODY,
  SCHEMA_FILE_NAME_PATTERN,
  SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY,
} from '../models/datamapper';
import { IMetadataApi, MetadataContext } from '../providers';
import { readFileAsString } from './read-file-as-string';

export const BrowserFilePickerMetadataProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const fileInputRef = createRef<HTMLInputElement>();
  const fileSelectionRef = useRef<{
    resolve: (files: Record<string, string>) => void;
    reject: (error: unknown) => unknown;
  }>();
  const fileContentsRef = useRef<Record<string, string>>();

  const askUserForFileSelection = useCallback(
    (
      include: string,
      _exclude?: string,
      _options?: Record<string, unknown>,
    ): Promise<string[] | string | undefined> => {
      if (!fileInputRef.current) return Promise.resolve(undefined);

      if (include === SCHEMA_FILE_NAME_PATTERN_SOURCE_BODY) {
        fileInputRef.current.accept = SCHEMA_FILE_ACCEPT_PATTERN_SOURCE_BODY;
      } else if (include === SCHEMA_FILE_NAME_PATTERN) {
        fileInputRef.current.accept = SCHEMA_FILE_ACCEPT_PATTERN;
      }

      fileInputRef.current.click();
      return new Promise<Record<string, string>>((resolve, reject) => {
        fileSelectionRef.current = { resolve, reject };
      }).then((files) => {
        fileContentsRef.current = files;
        return Object.keys(files);
      });
    },
    [fileInputRef],
  );

  const onImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const schemaFiles = event.target.files;
    if (!schemaFiles) return;
    const fileContents: Record<string, string> = {};
    const fileContentPromises: Promise<string>[] = [];
    Array.from(schemaFiles).forEach((f) => {
      const promise = readFileAsString(f).then((content) => (fileContents[f.name] = content));
      fileContentPromises.push(promise);
    });
    await Promise.allSettled(fileContentPromises);

    fileSelectionRef.current?.resolve(fileContents);
    fileSelectionRef.current = undefined;
    event.target.value = '';
  }, []);

  const getResourceContent = useCallback((path: string) => {
    return Promise.resolve(fileContentsRef.current && fileContentsRef.current[path]);
  }, []);

  const metadataApi: IMetadataApi = {
    askUserForFileSelection: askUserForFileSelection,
    getResourceContent: getResourceContent,
    shouldSaveSchema: true,
    getMetadata: () => Promise.resolve(undefined),
    setMetadata: () => Promise.resolve(),
    deleteResource: () => Promise.resolve(true),
    saveResourceContent: () => Promise.resolve(),
    getSuggestions: () => Promise.resolve([]),
    onStepUpdated: () => Promise.resolve(),
  };

  return (
    <MetadataContext.Provider value={metadataApi}>
      {props.children}
      <input
        type="file"
        style={{ display: 'none' }}
        data-testid={`attach-schema-file-input`}
        onChange={onImport}
        ref={fileInputRef}
      />
    </MetadataContext.Provider>
  );
};
