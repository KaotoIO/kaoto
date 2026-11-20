import { FileType } from '../../../services/files/stored-file';

/** The editors a file can open in: the route editor (canvas and code) or the text editor */
export type EditorKind = 'route' | 'text';

const EDITORS: Record<FileType, EditorKind> = {
  integration: 'route',
  'integration-test': 'route',
  document: 'text',
};

/** The editor a file opens in, chosen by its type; a new file type needs one entry here */
export const editorKindFor = (fileType: FileType): EditorKind => EDITORS[fileType];
