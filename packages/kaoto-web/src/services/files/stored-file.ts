/** What a file holds for the Explorer and the editors, derived from its path */
export type FileType = 'integration' | 'integration-test' | 'document';

/** A file as it is stored in the browser */
export interface StoredFile {
  /** A UUID, which is also used in the file route, so it only holds `[a-zA-Z0-9_-]` */
  id: string;
  /** `/`-separated and unique, e.g. `routes/my-route.camel.yaml` */
  path: string;
  content: string;
  /** Milliseconds since the epoch; set once when the entry is created */
  createdAt: number;
  /** Milliseconds since the epoch; moves whenever the stored entry changes, on a new content or path */
  updatedAt: number;
}

const TEST_FILE = /\.citrus\.(ya?ml|xml)$/;
const INTEGRATION_FILE = /\.(camel\.(ya?ml|xml)|kamelet\.ya?ml)$/;

/**
 * The type of a file, from its extension.
 *
 * `.citrus.yaml`, `.citrus.yml` and `.citrus.xml` files are integration tests; `.camel.yaml`, `.camel.yml`,
 * `.camel.xml`, `.kamelet.yaml` and `.kamelet.yml` files are integrations. Every other file, including a plain YAML or
 * XML file, is a document, as it is not a Kaoto resource.
 */
export const getFileType = (path: string): FileType => {
  if (TEST_FILE.test(path)) return 'integration-test';
  if (INTEGRATION_FILE.test(path)) return 'integration';
  return 'document';
};
