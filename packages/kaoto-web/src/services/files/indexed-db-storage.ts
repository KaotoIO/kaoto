import { FilesStore } from './files.store';
import { FilesStorage, StorageEntry } from './files-storage';

/**
 * Keeps a project's files in the browser storage (IndexedDB), through `FilesStore`.
 *
 * The stored entries keep their ids; they do not leave this storage, which speaks paths like every other one.
 */
export class IndexedDbStorage implements FilesStorage {
  constructor(private readonly store: FilesStore) {}

  list(): Promise<StorageEntry[]> {
    return this.store.getEntries();
  }

  readFile(path: string): Promise<string> {
    return this.store.readFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.store.updateFileAt(path, content);
  }

  async createFile(path: string, content: string): Promise<void> {
    await this.store.createFile({ path, content });
  }

  async moveFile(from: string, to: string): Promise<void> {
    await this.store.renameFileAt(from, to);
  }

  removeFile(path: string): Promise<void> {
    return this.store.deleteFileAt(path);
  }

  createFolder(path: string): Promise<void> {
    return this.store.createFolder(path);
  }

  async moveFolder(from: string, to: string): Promise<void> {
    await this.store.renameFolder(from, to);
  }

  async removeFolder(path: string): Promise<void> {
    await this.store.deleteFolder(path);
  }
}
