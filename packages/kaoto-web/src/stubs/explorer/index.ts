/** Placeholder file tree — replaced by real VFS data in a future story. */
export interface ExplorerFile {
  id: string;
  name: string;
  type: 'integration' | 'document' | 'folder';
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
      {
        id: 'routes',
        name: 'routes',
        type: 'folder',
        children: [
          { id: 'rest-api', name: 'rest-api.camel.yaml', type: 'integration' },
          { id: 'batch-job', name: 'batch-job.camel.yaml', type: 'integration' },
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
    ],
  },
];
