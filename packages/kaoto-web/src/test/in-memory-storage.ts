import { FilesStorage, StorageEntry } from '../services/files/files-storage';

type InitialEntry = { kind: 'file'; path: string; content: string } | { kind: 'folder'; path: string };

type Stored = { kind: 'file'; content: string } | { kind: 'folder' };

/** Whether the path is the folder or lies under it */
const isInFolder = (path: string, folderPath: string) => path === folderPath || path.startsWith(`${folderPath}/`);

/** The folder paths above a path, outermost first: `a/b/c.yaml` → `a`, `a/b` */
const parentsOf = (path: string): string[] =>
  path
    .split('/')
    .slice(0, -1)
    .map((_, index, segments) => segments.slice(0, index + 1).join('/'));

/**
 * A `FilesStorage` over a `Map`, for tests: it behaves like the real storages (the shared contract suite checks that)
 * without a storage, so that a test needs neither IndexedDB nor mocks.
 */
export class InMemoryStorage implements FilesStorage {
  private readonly entries = new Map<string, Stored>();
  private readsReleased: Promise<void> = Promise.resolve();

  /** @param initial files and folders to start with; their missing parent folders are added */
  constructor(initial: InitialEntry[] = []) {
    for (const entry of initial) {
      this.addParents(entry.path);
      this.entries.set(entry.path, entry.kind === 'file' ? { kind: 'file', content: entry.content } : entry);
    }
  }

  /** Holds every `readFile` back until `release()`, so that a test can act while a read is pending */
  delayReads(): { release: () => void } {
    let release!: () => void;
    this.readsReleased = new Promise((resolve) => {
      release = resolve;
    });
    return { release };
  }

  async list(): Promise<StorageEntry[]> {
    return [...this.entries].map(([path, { kind }]) => ({ kind, path }));
  }

  async readFile(path: string): Promise<string> {
    await this.readsReleased;
    return this.file(path).content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    this.file(path);
    this.entries.set(path, { kind: 'file', content });
  }

  async createFile(path: string, content: string): Promise<void> {
    this.checkFree(path);
    this.addParents(path);
    this.entries.set(path, { kind: 'file', content });
  }

  async moveFile(from: string, to: string): Promise<void> {
    const file = this.file(from);
    this.checkFree(to);
    this.addParents(to);
    this.entries.delete(from);
    this.entries.set(to, file);
  }

  async removeFile(path: string): Promise<void> {
    this.file(path);
    this.entries.delete(path);
  }

  async createFolder(path: string): Promise<void> {
    this.checkFree(path);
    this.addParents(path);
    this.entries.set(path, { kind: 'folder' });
  }

  async moveFolder(from: string, to: string): Promise<void> {
    if (this.entries.get(from)?.kind !== 'folder') throw new Error(`The folder ${from} does not exist`);
    if (isInFolder(to, from)) throw new Error('A folder cannot move into itself');
    this.checkFree(to);
    this.addParents(to);
    const moved = [...this.entries].filter(([path]) => isInFolder(path, from));
    for (const [path] of moved) this.entries.delete(path);
    for (const [path, entry] of moved) this.entries.set(`${to}${path.slice(from.length)}`, entry);
  }

  async removeFolder(path: string): Promise<void> {
    if (this.entries.get(path)?.kind === 'file') throw new Error(`${path} is a file`);
    // Deleting from a Map while iterating it is safe: the iteration skips the deleted keys
    for (const existing of this.entries.keys()) {
      if (isInFolder(existing, path)) this.entries.delete(existing);
    }
  }

  private file(path: string): { kind: 'file'; content: string } {
    const entry = this.entries.get(path);
    if (entry?.kind !== 'file') throw new Error(`The file ${path} does not exist`);
    return entry;
  }

  private checkFree(path: string): void {
    if (this.entries.has(path)) throw new Error(`${path} already exists`);
    const file = parentsOf(path).find((parent) => this.entries.get(parent)?.kind === 'file');
    if (file) throw new Error(`${file} is a file`);
  }

  private addParents(path: string): void {
    for (const parent of parentsOf(path)) {
      if (!this.entries.has(parent)) this.entries.set(parent, { kind: 'folder' });
    }
  }
}
