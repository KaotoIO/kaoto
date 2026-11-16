import { DBSchema, IDBPDatabase, openDB } from 'idb';

import { generateId } from './generate-id';
import { NewFile, StoredFile } from './stored-file';

const DB_VERSION = 1;
const FILES = 'files';

interface FilesDB extends DBSchema {
  [FILES]: {
    key: string;
    value: StoredFile;
    indexes: {
      byPath: string;
    };
  };
}

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
 * Keeps the files in IndexedDB.
 *
 * This is the only place that knows about the storage; the UI goes through this class.
 */
export class FilesStore {
  private dbPromise: Promise<IDBPDatabase<FilesDB>> | undefined;

  constructor(private readonly dbName = 'kaoto') {}

  /** All files, sorted by path */
  async getFiles(): Promise<StoredFile[]> {
    const db = await this.getDB();
    // An index returns its records in key order
    return db.getAllFromIndex(FILES, 'byPath');
  }

  /** Rejects when another file has the same path */
  async createFile(file: NewFile): Promise<StoredFile> {
    const db = await this.getDB();
    const created: StoredFile = {
      id: file.id ?? generateId(),
      path: file.path,
      content: file.content,
      updatedAt: Date.now(),
    };
    await db.add(FILES, created);
    return created;
  }

  async updateFile(id: string, content: string): Promise<StoredFile> {
    return this.modifyFile(id, (existing) => ({ ...existing, content, updatedAt: Date.now() }));
  }

  /**
   * Moves the file to another path; its id stays, so that an open file stays open.
   *
   * Rejects when another file has the path. The timestamp stays, as it tracks the content.
   */
  async renameFile(id: string, path: string): Promise<StoredFile> {
    return this.modifyFile(id, (existing) => ({ ...existing, path }));
  }

  async deleteFile(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(FILES, id);
  }

  /**
   * Deletes every file under the folder, in one transaction: either all of them are deleted or none.
   *
   * @param folderPath `/`-separated, without a leading or trailing `/`
   * @returns the ids of the deleted files
   */
  async deleteFolder(folderPath: string): Promise<string[]> {
    const db = await this.getDB();
    const tx = db.transaction(FILES, 'readwrite');
    observeCompletion(tx);
    // `0` follows `/` in code unit order, so this range holds exactly the paths that start with `${folderPath}/`
    const range = IDBKeyRange.bound(`${folderPath}/`, `${folderPath}0`, false, true);
    const ids = await tx.store.index('byPath').getAllKeys(range);
    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;
    return ids;
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

  /** Reads the file and writes its modified copy in one transaction; rejects when the file does not exist */
  private async modifyFile(id: string, modify: (existing: StoredFile) => StoredFile): Promise<StoredFile> {
    const db = await this.getDB();
    const tx = db.transaction(FILES, 'readwrite');
    observeCompletion(tx);
    const existing = await tx.store.get(id);
    if (!existing) {
      // Nothing was written, so the transaction completes on its own
      throw new Error(`The file ${id} does not exist`);
    }

    const modified = modify(existing);
    await tx.store.put(modified);
    await tx.done;
    return modified;
  }

  private getDB(): Promise<IDBPDatabase<FilesDB>> {
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

  private async openDB(): Promise<IDBPDatabase<FilesDB>> {
    const forget = () => {
      this.dbPromise = undefined;
    };

    const db = await openDB<FilesDB>(this.dbName, DB_VERSION, {
      upgrade(upgradeDb) {
        const files = upgradeDb.createObjectStore(FILES, { keyPath: 'id' });
        files.createIndex('byPath', 'path', { unique: true });
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
}

export const filesStore = new FilesStore();
