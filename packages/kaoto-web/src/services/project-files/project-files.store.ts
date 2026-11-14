import { DBSchema, IDBPDatabase, openDB } from 'idb';

import { NewProjectFile, ProjectFile } from './project-file';

const DB_VERSION = 1;
const FILES = 'files';

interface ProjectFilesDB extends DBSchema {
  [FILES]: {
    key: [string, string];
    value: ProjectFile;
    indexes: {
      byProject: string;
      byProjectPath: [string, string];
    };
  };
}

const byPath = (a: ProjectFile, b: ProjectFile) => {
  if (a.path === b.path) return 0;
  return a.path < b.path ? -1 : 1;
};

/**
 * Keeps the files of the projects in IndexedDB.
 *
 * This is the only place that knows about the storage; the UI goes through this class.
 */
export class ProjectFilesStore {
  private dbPromise: Promise<IDBPDatabase<ProjectFilesDB>> | undefined;

  constructor(private readonly dbName = 'kaoto-projects') {}

  async getFiles(projectId: string): Promise<ProjectFile[]> {
    const db = await this.getDB();
    const files = await db.getAllFromIndex(FILES, 'byProject', projectId);
    return files.sort(byPath);
  }

  async createFile(projectId: string, file: NewProjectFile): Promise<ProjectFile> {
    const db = await this.getDB();
    const created = this.toProjectFile(projectId, file);
    await db.add(FILES, created);
    return created;
  }

  async updateFile(projectId: string, id: string, content: string): Promise<ProjectFile> {
    const db = await this.getDB();
    const tx = db.transaction(FILES, 'readwrite');
    const existing = await tx.store.get([projectId, id]);
    if (!existing) {
      // Nothing was written, so the transaction completes on its own
      throw new Error(`The file ${id} does not exist in the project ${projectId}`);
    }

    const updated: ProjectFile = { ...existing, content, updatedAt: Date.now() };
    await tx.store.put(updated);
    await tx.done;
    return updated;
  }

  async deleteFile(projectId: string, id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(FILES, [projectId, id]);
  }

  /**
   * Adds the seed files when the project has no files yet.
   *
   * Count and add share one transaction, so two tabs opening the same new project cannot both seed it.
   */
  async seedIfEmpty(projectId: string, seed: NewProjectFile[]): Promise<ProjectFile[]> {
    const db = await this.getDB();
    const tx = db.transaction(FILES, 'readwrite');
    const count = await tx.store.index('byProject').count(projectId);
    if (count === 0) {
      await Promise.all(seed.map((file) => tx.store.add(this.toProjectFile(projectId, file))));
    }
    await tx.done;

    return this.getFiles(projectId);
  }

  close(): void {
    const dbPromise = this.dbPromise;
    this.dbPromise = undefined;
    dbPromise
      ?.then((db) => {
        db.close();
      })
      .catch(() => undefined);
  }

  private getDB(): Promise<IDBPDatabase<ProjectFilesDB>> {
    if (!this.dbPromise) {
      const dbPromise = this.openDB();
      this.dbPromise = dbPromise;
      // Forget a failed attempt, so that the next call tries again
      dbPromise.catch(() => {
        if (this.dbPromise === dbPromise) this.dbPromise = undefined;
      });
    }
    return this.dbPromise;
  }

  private async openDB(): Promise<IDBPDatabase<ProjectFilesDB>> {
    return openDB<ProjectFilesDB>(this.dbName, DB_VERSION, {
      upgrade(db) {
        const files = db.createObjectStore(FILES, { keyPath: ['projectId', 'id'] });
        files.createIndex('byProject', 'projectId');
        files.createIndex('byProjectPath', ['projectId', 'path'], { unique: true });
      },
    });
  }

  private toProjectFile(projectId: string, file: NewProjectFile): ProjectFile {
    return {
      projectId,
      id: file.id ?? crypto.randomUUID(),
      path: file.path,
      type: file.type,
      content: file.content,
      updatedAt: Date.now(),
    };
  }
}

export const projectFilesStore = new ProjectFilesStore();
