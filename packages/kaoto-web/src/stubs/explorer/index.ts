/** Placeholder file tree — replaced by real VFS data in a future story. */
export interface ExplorerFile {
  id: string;
  name: string;
  type: 'integration' | 'integration-test' | 'document' | 'folder';
  children?: ExplorerFile[];
}

export const STUB_FILES: ExplorerFile[] = [
  {
    id: 'integrations',
    name: 'Integrations',
    type: 'folder',
    children: [
      { id: 'main-flow', name: 'main-flow.camel.yaml', type: 'integration' },
      { id: 'error-handler', name: 'error-handler.camel.yaml', type: 'integration' },
      // Other resource types the canvas can open (see getResourceTypeFromPath in @kaoto/kaoto)
      { id: 'order-test', name: 'order-test.citrus.yaml', type: 'integration-test' },
      { id: 'timer-source', name: 'timer-source.kamelet.yaml', type: 'integration' },
      { id: 'orders-pipe', name: 'orders.pipe.yaml', type: 'integration' },
      { id: 'legacy-route', name: 'legacy-route.xml', type: 'integration' },
      {
        id: 'routes',
        name: 'routes',
        type: 'folder',
        children: [
          { id: 'rest-api', name: 'rest-api.camel.yaml', type: 'integration' },
          { id: 'batch-job', name: 'batch-job.camel.yaml', type: 'integration' },
          {
            id: 'async',
            name: 'async',
            type: 'folder',
            children: [
              { id: 'kafka-consumer', name: 'kafka-consumer.camel.yaml', type: 'integration' },
              { id: 'kafka-producer', name: 'kafka-producer.camel.yaml', type: 'integration' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'resources',
    name: 'Resources',
    type: 'folder',
    children: [
      { id: 'schema', name: 'schema.xsd', type: 'document' },
      { id: 'mapping', name: 'mapping.xsl', type: 'document' },
      {
        id: 'templates',
        name: 'templates',
        type: 'folder',
        children: [
          { id: 'order-template', name: 'order-template.json', type: 'document' },
          { id: 'invoice-template', name: 'invoice-template.json', type: 'document' },
        ],
      },
    ],
  },
];
