/** What a file holds for the Explorer and the editors, derived from its path */
export type FileType = 'integration' | 'integration-test' | 'document';

/** A file as it is stored in the browser */
export interface StoredFile {
  /** A UUID, which is also used in the file route, so it only holds `[a-zA-Z0-9_-]` */
  id: string;
  /** `/`-separated and unique, e.g. `routes/my-route.camel.yaml` */
  path: string;
  content: string;
  /** Milliseconds since the epoch */
  updatedAt: number;
}

export interface NewFile {
  path: string;
  content: string;
  /** Generated when omitted */
  id?: string;
}

const TEST_FILE = /\.citrus(\.(test|it))?\.(ya?ml|xml)$/;
const INTEGRATION_FILE = /\.(ya?ml|xml)$/;

/**
 * The type of a file, from its extension.
 *
 * Citrus files are integration tests. Any other YAML or XML file is an integration, as Kaoto opens such a file as a
 * Camel route; every other file is a document.
 */
export const getFileType = (path: string): FileType => {
  if (TEST_FILE.test(path)) return 'integration-test';
  if (INTEGRATION_FILE.test(path)) return 'integration';
  return 'document';
};
