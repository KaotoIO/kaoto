/** A file open in an editor: its content as it was read when the file opened */
export interface OpenFile {
  /** The key of its entry in the files store */
  key: string;
  path: string;
  content: string;
}
