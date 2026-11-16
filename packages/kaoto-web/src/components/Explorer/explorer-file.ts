import { FileType } from '../../services/files/stored-file';

/** A node of the Explorer tree: a stored file or a folder derived from the file paths */
export interface ExplorerFile {
  id: string;
  name: string;
  type: FileType | 'folder';
  children?: ExplorerFile[];
}
