import { ProjectFileType } from '../../services/project-files/project-file';

/** A node of the Explorer tree: a project file or a folder derived from the file paths */
export interface ExplorerFile {
  id: string;
  name: string;
  type: ProjectFileType | 'folder';
  children?: ExplorerFile[];
}
