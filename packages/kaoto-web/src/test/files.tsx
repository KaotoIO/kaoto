import { ReactElement } from 'react';

import { FilesProvider } from '../context/FilesContext';
import { filesStore } from '../services/files/files.store';
import { NewFile } from '../services/files/stored-file';

/**
 * Files for the tests, with readable ids.
 *
 * The first integration has content and the integration test and the documents are empty, as an empty file is what a
 * user gets for a file type Kaoto has no template for.
 */
export const TEST_FILES: Required<NewFile>[] = [
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

/** Adds the files to the shared store; call `resetTestIndexedDB()` before, so that every test starts empty */
export const storeTestFiles = async (files: NewFile[] = TEST_FILES): Promise<void> => {
  await Promise.all(files.map((file) => filesStore.createFile(file)));
};

/** Wraps the element in a FilesProvider backed by the shared store; use it inside the router */
export const withFiles = (ui: ReactElement): ReactElement => <FilesProvider>{ui}</FilesProvider>;
