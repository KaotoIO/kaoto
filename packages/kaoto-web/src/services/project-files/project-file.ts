export type ProjectFileType = 'integration' | 'integration-test' | 'document';

/** A file of a project as it is stored in the browser */
export interface ProjectFile {
  projectId: string;
  /** Stable within the project; used in the integration route, so it only holds `[a-zA-Z0-9_-]` */
  id: string;
  /** Relative to the project root, `/`-separated, e.g. `routes/my-route.camel.yaml` */
  path: string;
  type: ProjectFileType;
  content: string;
  /** Milliseconds since the epoch */
  updatedAt: number;
}

export interface NewProjectFile {
  path: string;
  type: ProjectFileType;
  content: string;
  /** Generated when omitted */
  id?: string;
}
