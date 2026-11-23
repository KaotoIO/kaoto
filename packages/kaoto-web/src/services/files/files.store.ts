import { IDBPDatabase, IDBPTransaction, openDB } from 'idb';

import { StorageEntry } from './files-storage';
import { generateId } from './generate-id';
import { NewFile, StoredFile } from './stored-file';

/** The version of the table layout; the database version also counts created and deleted projects */
const SCHEMA_VERSION = 1;
const META = 'meta';
const PROJECTS = 'projects';
/** The tables of the first kaoto-web builds; dropped without migration, as kaoto-web had no users yet */
const OLD_STORES = ['files', 'folders'];
const BY_PATH = 'byPath';
const DEFAULT_PROJECT_NAME = 'Default';

/** The table that holds the files and folders of a project */
const contentStore = (projectId: string): string => `content:${projectId}`;

export interface StoredProject {
  id: string;
  name: string;
  /** Milliseconds since the epoch */
  createdAt: number;
  /** Moves on a rename and on every change to the project's files and folders */
  updatedAt: number;
}

interface StoredFolder {
  id: string;
  path: string;
  kind: 'folder';
  createdAt: number;
  /** Moves on create and rename, not when its content changes */
  updatedAt: number;
}

type StoredEntry = StoredFolder | (StoredFile & { kind: 'file' });

interface SchemaMarker {
  key: 'schema';
  version: number;
}

type Db = IDBPDatabase<unknown>;
type WriteTx = IDBPTransaction<unknown, string[], 'readwrite'>;

interface Connection {
  db: Db;
  /** The project the files belong to; the default project until projects can be picked */
  projectId: string;
}

/** The paths under a folder: `0` follows `/` in code unit order, so this range holds exactly `${folderPath}/…` */
const pathsUnder = (folderPath: string): IDBKeyRange =>
  IDBKeyRange.bound(`${folderPath}/`, `${folderPath}0`, false, true);

/** The folder paths above a path, outermost first: `a/b/c.yaml` → `a`, `a/b` */
const parentsOf = (path: string): string[] =>
  path
    .split('/')
    .slice(0, -1)
    .map((_, index, segments) => segments.slice(0, index + 1).join('/'));

const toFile = ({ kind: _kind, ...file }: StoredEntry & { kind: 'file' }): StoredFile => file;

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
 * Keeps the projects and their files and folders in IndexedDB.
 *
 * One database holds the `projects` table and one `content:<projectId>` table per project with its files and
 * folders, each an entry with its path. Creating or deleting a table needs a new database version, so the version
 * also counts projects; the `meta` table marks the layout. This is the only place that knows about the storage; the
 * UI goes through this class and works on the default project.
 */
export class FilesStore {
  private connection: Promise<Connection> | undefined;

  constructor(private readonly dbName = 'kaoto') {}

  async getProjects(): Promise<StoredProject[]> {
    const { db } = await this.connect();
    return db.getAll(PROJECTS);
  }

  /** All files and folders, sorted by path, without the content of the files */
  async getEntries(): Promise<StorageEntry[]> {
    const entries = await this.getStoredEntries();
    return entries.map(({ kind, path }) => ({ kind, path }));
  }

  /** All files, sorted by path */
  async getFiles(): Promise<StoredFile[]> {
    const entries = await this.getStoredEntries();
    return entries.filter((entry): entry is StoredEntry & { kind: 'file' } => entry.kind === 'file').map(toFile);
  }

  /** All folder paths, sorted */
  async getFolders(): Promise<string[]> {
    const entries = await this.getStoredEntries();
    return entries.filter((entry) => entry.kind === 'folder').map(({ path }) => path);
  }

  /** Creates the missing parent folders; rejects when the path is taken or a parent is a file */
  async createFile(file: NewFile): Promise<StoredFile> {
    return this.write(async (content, now) => {
      await ensureParents(content, file.path, now);
      const created: StoredEntry = {
        id: file.id ?? generateId(),
        path: file.path,
        kind: 'file',
        content: file.content,
        createdAt: now,
        updatedAt: now,
      };
      await content.add(created);
      return toFile(created);
    });
  }

  /**
   * Keeps a folder, also while it holds no file; creates the missing parent folders.
   *
   * @param folderPath `/`-separated, without a leading or trailing `/`; rejects when the path is taken
   */
  async createFolder(folderPath: string): Promise<void> {
    await this.write(async (content, now) => {
      await ensureParents(content, folderPath, now);
      await content.add(newFolder(folderPath, now));
    });
  }

  /** The content of the file at the path; rejects when there is no file at the path */
  async readFile(path: string): Promise<string> {
    const { db, projectId } = await this.connect();
    const entry = (await db.getFromIndex(contentStore(projectId), BY_PATH, path)) as StoredEntry | undefined;
    if (entry?.kind !== 'file') throw new Error(`The file ${path} does not exist`);
    return entry.content;
  }

  /** Like `updateFile`, for the file at the path; the path is looked up in the same transaction */
  async updateFileAt(path: string, content: string): Promise<StoredFile> {
    return this.modifyFileAt(path, (existing, now) => ({ ...existing, content, updatedAt: now }));
  }

  /** Like `renameFile`, for the file at the path; the path is looked up in the same transaction */
  async renameFileAt(path: string, newPath: string): Promise<StoredFile> {
    return this.modifyFileAt(path, (existing, now) => ({ ...existing, path: newPath, updatedAt: now }), newPath);
  }

  /** Deletes the file at the path; rejects when there is no file at the path */
  async deleteFileAt(path: string): Promise<void> {
    await this.write(async (content) => {
      const existing = await fileAt(content, path);
      await content.delete(existing.id);
    });
  }

  async updateFile(id: string, content: string): Promise<StoredFile> {
    return this.modifyFile(id, (existing, now) => ({ ...existing, content, updatedAt: now }));
  }

  /**
   * Moves the file to another path; its id stays, so that an open file stays open.
   *
   * Rejects when the path is taken; creates the missing parent folders. The update time moves, as it tracks the
   * stored entry and the path is part of it; the creation time stays.
   */
  async renameFile(id: string, path: string): Promise<StoredFile> {
    return this.modifyFile(id, (existing, now) => ({ ...existing, path, updatedAt: now }), path);
  }

  /**
   * Moves the folder with every folder and file under it to another path, in one transaction; their ids stay, so that
   * an open file stays open. Creates the missing parent folders of the new path.
   *
   * Rejects when the folder does not exist, the new path is taken or lies under a file or inside the folder itself.
   * The update time of the folder and of every entry under it moves, as their paths change; creation times stay.
   *
   * @returns the moved files with their new paths
   */
  async renameFolder(folderPath: string, newPath: string): Promise<StoredFile[]> {
    return this.write(async (content, now) => {
      const index = content.index(BY_PATH);
      const folder = (await index.get(folderPath)) as StoredEntry | undefined;
      if (folder?.kind !== 'folder') throw new Error(`The folder ${folderPath} does not exist`);
      if (newPath.startsWith(`${folderPath}/`)) throw new Error('A folder cannot move into itself');
      if (await index.getKey(newPath)) throw new Error(`${newPath} already exists`);
      await ensureParents(content, newPath, now);

      const entries = (await index.getAll(pathsUnder(folderPath))) as StoredEntry[];
      const moved = entries.map((entry) => ({
        ...entry,
        path: `${newPath}${entry.path.slice(folderPath.length)}`,
        updatedAt: now,
      }));
      await Promise.all([
        content.put({ ...folder, path: newPath, updatedAt: now }),
        ...moved.map((entry) => content.put(entry)),
      ]);
      return moved.filter((entry): entry is StoredEntry & { kind: 'file' } => entry.kind === 'file').map(toFile);
    });
  }

  async deleteFile(id: string): Promise<void> {
    await this.write(async (content) => {
      await content.delete(id);
    });
  }

  /**
   * Deletes the folder with every folder and file under it, in one transaction: either all of them or none. Rejects
   * when a file is at the path, so that a file is never deleted as a folder.
   *
   * @param folderPath `/`-separated, without a leading or trailing `/`
   * @returns the ids of the deleted files
   */
  async deleteFolder(folderPath: string): Promise<string[]> {
    return this.write(async (content) => {
      const index = content.index(BY_PATH);
      const folder = (await index.get(folderPath)) as StoredEntry | undefined;
      if (folder?.kind === 'file') throw new Error(`${folderPath} is a file`);
      const entries = (await index.getAll(pathsUnder(folderPath))) as StoredEntry[];
      const ids = entries.map(({ id }) => id);
      await Promise.all([...ids, ...(folder ? [folder.id] : [])].map((id) => content.delete(id)));
      return entries.filter(({ kind }) => kind === 'file').map(({ id }) => id);
    });
  }

  close(): void {
    const connection = this.connection;
    this.connection = undefined;
    connection
      ?.then(({ db }) => {
        db.close();
      })
      .catch(() => undefined);
  }

  private async getStoredEntries(): Promise<StoredEntry[]> {
    const { db, projectId } = await this.connect();
    // An index returns its records in key order
    return db.getAllFromIndex(contentStore(projectId), BY_PATH);
  }

  /**
   * Runs the change in one transaction over the project's content and the project, and moves the project's update
   * time with it.
   */
  private async write<T>(change: (content: ReturnType<WriteTx['objectStore']>, now: number) => Promise<T>): Promise<T> {
    const { db, projectId } = await this.connect();
    const tx = db.transaction([contentStore(projectId), PROJECTS], 'readwrite');
    observeCompletion(tx);
    const now = Date.now();
    const result = await change(tx.objectStore(contentStore(projectId)), now);
    const projects = tx.objectStore(PROJECTS);
    const project = (await projects.get(projectId)) as StoredProject;
    await projects.put({ ...project, updatedAt: now });
    await tx.done;
    return result;
  }

  /** Reads the file and writes its modified copy in one transaction; rejects when the file does not exist */
  private async modifyFile(
    id: string,
    modify: (existing: StoredEntry & { kind: 'file' }, now: number) => StoredEntry & { kind: 'file' },
    newPath?: string,
  ): Promise<StoredFile> {
    return this.write(async (content, now) => {
      const existing = (await content.get(id)) as StoredEntry | undefined;
      if (existing?.kind !== 'file') {
        throw new Error(`The file ${id} does not exist`);
      }
      if (newPath) await ensureParents(content, newPath, now);
      const modified = modify(existing, now);
      await content.put(modified);
      return toFile(modified);
    });
  }

  /** Reads the file at the path and writes its modified copy in one transaction */
  private async modifyFileAt(
    path: string,
    modify: (existing: StoredEntry & { kind: 'file' }, now: number) => StoredEntry & { kind: 'file' },
    newPath?: string,
  ): Promise<StoredFile> {
    return this.write(async (content, now) => {
      const existing = await fileAt(content, path);
      if (newPath) await ensureParents(content, newPath, now);
      const modified = modify(existing, now);
      await content.put(modified);
      return toFile(modified);
    });
  }

  private connect(): Promise<Connection> {
    if (!this.connection) {
      const connection = this.open();
      this.connection = connection;
      // Forget a failed attempt, so that the next call tries again
      connection.catch(() => {
        if (this.connection === connection) this.connection = undefined;
      });
    }
    return this.connection;
  }

  /**
   * Opens the database at its current version. When the layout is missing or older, or there is no project yet, it
   * opens again one version up and sets the layout and the default project up there.
   */
  private async open(): Promise<Connection> {
    let db = await this.openAt(undefined);
    const ready = await readyProject(db);
    if (ready.kind === 'newer') {
      db.close();
      throw new Error('The browser storage was set up by a newer Kaoto. Reload this page to use it.');
    }
    if (ready.kind === 'ready') return { db, projectId: ready.projectId };

    const nextVersion = db.version + 1;
    db.close();
    db = await this.openAt(nextVersion);
    const upgraded = await readyProject(db);
    if (upgraded.kind !== 'ready') {
      db.close();
      throw new Error('The browser storage could not be set up');
    }
    return { db, projectId: upgraded.projectId };
  }

  private async openAt(version: number | undefined): Promise<Db> {
    const forget = () => {
      this.connection = undefined;
    };

    const db = await openDB(this.dbName, version, {
      upgrade(upgradeDb, _oldVersion, _newVersion, tx) {
        if (version === undefined) return;
        setUpLayout(upgradeDb, tx);
      },
      // Another tab raises the version (a new layout or a new project): step aside instead of blocking it and open
      // again on the next access. A tab whose code is older than the layout then fails there and shows an error.
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

/** The default project, or why the database is not ready to use */
async function readyProject(
  db: Db,
): Promise<{ kind: 'ready'; projectId: string } | { kind: 'setup' } | { kind: 'newer' }> {
  if (!db.objectStoreNames.contains(META) || !db.objectStoreNames.contains(PROJECTS)) return { kind: 'setup' };
  const marker = (await db.get(META, 'schema')) as SchemaMarker | undefined;
  if (!marker || marker.version < SCHEMA_VERSION) return { kind: 'setup' };
  if (marker.version > SCHEMA_VERSION) return { kind: 'newer' };
  const [project] = (await db.getAll(PROJECTS)) as StoredProject[];
  if (!project || !db.objectStoreNames.contains(contentStore(project.id))) return { kind: 'setup' };
  return { kind: 'ready', projectId: project.id };
}

/**
 * Sets up the layout in a version change: drops the tables of the first builds, adds `meta` and `projects`, and adds
 * the default project with its content table when there is no project yet. Version changes run one after another,
 * so a second tab opening at the same version finds the project of the first one and does not add another.
 */
function setUpLayout(db: Db, tx: IDBPTransaction<unknown, string[], 'versionchange'>): void {
  for (const name of OLD_STORES) {
    if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
  }
  if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' });
  void tx.objectStore(META).put({ key: 'schema', version: SCHEMA_VERSION } satisfies SchemaMarker);

  if (!db.objectStoreNames.contains(PROJECTS)) {
    db.createObjectStore(PROJECTS, { keyPath: 'id' });
    addDefaultProject(db, tx);
    return;
  }
  // The version change stays open while its requests are answered, so tables can still be added here
  void tx
    .objectStore(PROJECTS)
    .getAll()
    .then((projects) => {
      if (projects.length === 0) {
        addDefaultProject(db, tx);
        return;
      }
      for (const { id } of projects as StoredProject[]) {
        if (!db.objectStoreNames.contains(contentStore(id))) createContentStore(db, id);
      }
    });
}

function addDefaultProject(db: Db, tx: IDBPTransaction<unknown, string[], 'versionchange'>): void {
  const now = Date.now();
  const project: StoredProject = { id: generateId(), name: DEFAULT_PROJECT_NAME, createdAt: now, updatedAt: now };
  createContentStore(db, project.id);
  void tx.objectStore(PROJECTS).add(project);
}

function createContentStore(db: Db, projectId: string): void {
  db.createObjectStore(contentStore(projectId), { keyPath: 'id' }).createIndex(BY_PATH, 'path', { unique: true });
}

function newFolder(path: string, now: number): StoredFolder {
  return { id: generateId(), path, kind: 'folder', createdAt: now, updatedAt: now };
}

/** The file at the path; rejects when there is none, also when a folder is at the path */
async function fileAt(
  content: ReturnType<WriteTx['objectStore']>,
  path: string,
): Promise<StoredEntry & { kind: 'file' }> {
  const existing = (await content.index(BY_PATH).get(path)) as StoredEntry | undefined;
  if (existing?.kind !== 'file') throw new Error(`The file ${path} does not exist`);
  return existing;
}

/** Adds the missing parent folders of the path; rejects when a parent is a file */
async function ensureParents(content: ReturnType<WriteTx['objectStore']>, path: string, now: number): Promise<void> {
  const index = content.index(BY_PATH);
  const parents = parentsOf(path);
  const existing = (await Promise.all(parents.map((parent) => index.get(parent)))) as (StoredEntry | undefined)[];
  const file = existing.find((entry) => entry?.kind === 'file');
  if (file) throw new Error(`${file.path} is a file`);
  await Promise.all(parents.filter((_, i) => !existing[i]).map((parent) => content.add(newFolder(parent, now))));
}

export const filesStore = new FilesStore();
