import { SourceCodeAdapter, SourceDocument } from '@kaoto/kaoto/components';

import { StoredFile } from '../../../services/files/stored-file';

type OpenedFile = Pick<StoredFile, 'id' | 'path' | 'content'>;

/** Connects the open route file to RouteVisualization; one instance stays for every route file opened after it */
export interface FileSourceCodeAdapter extends SourceCodeAdapter {
  /** Delivers the file to the editor; a later call switches it to another file */
  open(file: OpenedFile): void;
}

/**
 * The document of RouteVisualization, kept in the stored files.
 *
 * Changes are saved to the file that is open when they arrive, and content the file already has (the delivered or the
 * last saved content) is not saved again.
 */
export const createFileSourceCodeAdapter = (save: (fileId: string, code: string) => void): FileSourceCodeAdapter => {
  let openFile: OpenedFile | undefined;
  let storedContent: string | undefined;
  let apply: ((document: SourceDocument) => void) | undefined;

  const deliver = () => {
    if (openFile) apply?.({ code: openFile.content, path: openFile.path });
  };

  return {
    open(file) {
      openFile = file;
      storedContent = file.content;
      deliver();
    },
    subscribe(applyDocument) {
      apply = applyDocument;
      deliver();
      return () => {
        if (apply === applyDocument) apply = undefined;
      };
    },
    onChange(code) {
      if (!openFile || code === storedContent) return;
      storedContent = code;
      save(openFile.id, code);
    },
  };
};
