import { ReactElement } from 'react';

import { FilesProvider } from '../context/FilesContext';
import { indexedDbStorage } from '../services/files/indexed-db-storage';

/** A file for the tests: the id is only a short name for it in the tests; the storage names files by their paths */
export interface TestFile {
  id: string;
  path: string;
  content: string;
}

/**
 * Files for the tests, with short names.
 *
 * The first integration has content and the integration test and the documents are empty, as an empty file is what a
 * user gets for a file type Kaoto has no template for.
 */
export const TEST_FILES: TestFile[] = [
  {
    id: 'main-flow',
    path: 'integrations/main-flow.camel.yaml',
    content: `- route:
    id: main-flow
    from:
      uri: timer:orders
      steps:
        - to:
            uri: log:orders
`,
  },
  {
    id: 'error-handler',
    path: 'integrations/error-handler.camel.yaml',
    content: `- errorHandler:
    deadLetterChannel:
      deadLetterUri: log:dead-letters
`,
  },
  { id: 'order-test', path: 'integrations/order-test.citrus.yaml', content: 'name: order-test\n' },
  { id: 'timer-source', path: 'integrations/timer-source.kamelet.yaml', content: 'kind: Kamelet\n' },
  { id: 'orders-pipe', path: 'integrations/orders.pipe.yaml', content: 'kind: Pipe\n' },
  { id: 'legacy-route', path: 'integrations/legacy-route.xml', content: '<camel/>\n' },
  { id: 'rest-api', path: 'integrations/routes/rest-api.camel.yaml', content: '- rest: {}\n' },
  { id: 'kafka-consumer', path: 'integrations/routes/async/kafka-consumer.camel.yaml', content: '' },
  { id: 'kafka-producer', path: 'integrations/routes/async/kafka-producer.camel.yaml', content: '' },
  { id: 'schema', path: 'resources/schema.xsd', content: '' },
  { id: 'mapping', path: 'resources/mapping.xsl', content: '' },
  { id: 'order-template', path: 'resources/templates/order-template.json', content: '' },
];

/** The path of the test file with the id */
export const pathOf = (id: string): string => TEST_FILES.find((file) => file.id === id)!.path;

/** Adds the files to the shared storage; call `resetTestIndexedDB()` before, so that every test starts empty */
export const storeTestFiles = async (
  files: (Pick<TestFile, 'path' | 'content'> & { id?: string })[] = TEST_FILES,
): Promise<void> => {
  await Promise.all(files.map(({ path, content }) => indexedDbStorage.createFile(path, content)));
};

/** Code unit order, as the storage lists paths */
const byCodeUnits = (a: string, b: string) => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

/** The files in the shared storage with their content, sorted by path */
export const storedFiles = async (): Promise<{ path: string; content: string }[]> => {
  const paths = (await indexedDbStorage.list())
    .filter(({ kind }) => kind === 'file')
    .map(({ path }) => path)
    .sort(byCodeUnits);
  return Promise.all(paths.map(async (path) => ({ path, content: await indexedDbStorage.readFile(path) })));
};

/** The paths of the files in the shared storage, sorted */
export const storedPaths = async (): Promise<string[]> => (await storedFiles()).map(({ path }) => path);

/** The paths of the folders in the shared storage, sorted */
export const storedFolders = async (): Promise<string[]> =>
  (await indexedDbStorage.list())
    .filter(({ kind }) => kind === 'folder')
    .map(({ path }) => path)
    .sort(byCodeUnits);

/** Wraps the element in a FilesProvider backed by the shared storage; use it inside the router */
export const withFiles = (ui: ReactElement): ReactElement => <FilesProvider>{ui}</FilesProvider>;
