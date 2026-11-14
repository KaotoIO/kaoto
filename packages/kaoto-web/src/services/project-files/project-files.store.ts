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
 * Marks the completion of a transaction as handled.
 *
 * When a request fails, the caller gets its error and never awaits `tx.done`, which rejects as well;
 * without this, that second rejection would go unhandled. Awaiting `tx.done` still rejects as before.
 */
const observeCompletion = (tx: { done: Promise<void> }): void => {
  tx.done.catch(() => undefined);
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
    observeCompletion(tx);
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
   * A project with files is only read. Otherwise count and add share one transaction, so two tabs opening
   * the same new project cannot both seed it.
   */
  async seedIfEmpty(projectId: string, seed: NewProjectFile[]): Promise<ProjectFile[]> {
    const files = await this.getFiles(projectId);
    if (files.length > 0) return files;

    const db = await this.getDB();
    const tx = db.transaction(FILES, 'readwrite');
    observeCompletion(tx);
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
    const forget = () => {
      this.dbPromise = undefined;
    };

    const db = await openDB<ProjectFilesDB>(this.dbName, DB_VERSION, {
      upgrade(upgradeDb) {
        const files = upgradeDb.createObjectStore(FILES, { keyPath: ['projectId', 'id'] });
        files.createIndex('byProject', 'projectId');
        files.createIndex('byProjectPath', ['projectId', 'path'], { unique: true });
      },
      // A tab running a newer Kaoto wants to upgrade the database: step aside instead of blocking it.
      // This tab then fails on its next access (the database is newer than this code) and shows an error.
      blocking() {
        db.close();
        forget();
      },
      // The browser closed the connection (e.g. the site data was cleared): reopen on the next access
      terminated: forget,
    });
    return db;
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
