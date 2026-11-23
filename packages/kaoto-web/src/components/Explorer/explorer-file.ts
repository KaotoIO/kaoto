import { FileType } from '../../services/files/stored-file';

/** A node of the Explorer tree: a file or a folder of the files store */
export interface ExplorerFile {
  /** The key of its entry in the files store, which stays when the entry moves */
  id: string;
  path: string;
  name: string;
  type: FileType | 'folder';
  children?: ExplorerFile[];
}
