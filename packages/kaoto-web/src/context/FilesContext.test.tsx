import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, useState } from 'react';

import { useFiles } from '../hooks/useFiles';
import { InMemoryStorage } from '../test/in-memory-storage';
import { FilesProvider } from './FilesContext';

const Consumer: FunctionComponent = () => {
  const {
    files,
    folders,
    loading,
    error,
    reload,
    createFile,
    createFolder,
    updateFile,
    renameFile,
    renameFolder,
    deleteFile,
    deleteFolder,
  } = useFiles();
  const [renameError, setRenameError] = useState<string>();
  let state = files.map((file) => `${file.id}=${file.content}`).join(',');
  if (loading) state = 'loading';
  if (error) state = `error ${error.message}`;
  return (
    <>
      <div data-testid="state">{state}</div>
      <div data-testid="rename-error">{renameError}</div>
      <div data-testid="folders">{folders.join(',')}</div>
      <button onClick={reload}>reload</button>
      <button onClick={() => void updateFile('a.yaml', 'changed').catch(() => undefined)}>update</button>
      <button onClick={() => void createFile({ path: 'a/c.yaml', content: 'C' }).catch(() => undefined)}>create</button>
      <button
        onClick={() =>
          void renameFile('a.yaml', 'z.yaml').catch((renameFailure: unknown) => {
            setRenameError(renameFailure instanceof Error ? renameFailure.message : String(renameFailure));
          })
        }
      >
        rename
      </button>
      <button onClick={() => void deleteFile('a.yaml').catch(() => undefined)}>delete file</button>
      <button onClick={() => void deleteFolder('a').catch(() => undefined)}>delete folder</button>
      <button onClick={() => void createFolder('a/new').catch(() => undefined)}>create folder</button>
      <button onClick={() => void renameFolder('a', 'z').catch(() => undefined)}>rename folder</button>
    </>
  );
};

const renderProvider = (storage: InMemoryStorage) =>
  render(
    <FilesProvider storage={storage}>
      <Consumer />
    </FilesProvider>,
  );

const click = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }));
};

const storedPaths = async (storage: InMemoryStorage) =>
  (await storage.list())
    .filter(({ kind }) => kind === 'file')
    .map(({ path }) => path)
    .sort();

describe('FilesProvider', () => {
  it('starts loading and then exposes no files when nothing is stored', async () => {
    renderProvider(new InMemoryStorage());

    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    await waitFor(() => {
      expect(screen.getByTestId('state')).toBeEmptyDOMElement();
    });
  });

  it('exposes the stored files with their content, sorted by path, with the path as their id', async () => {
    renderProvider(
      new InMemoryStorage([
        { kind: 'file', path: 'b.yaml', content: 'B' },
        { kind: 'file', path: 'a.yaml', content: 'A' },
      ]),
    );

    expect(await screen.findByText('a.yaml=A,b.yaml=B')).toBeInTheDocument();
  });

  it.each([
    ['an Error', new Error('blocked'), 'error blocked'],
    ['a failure that is no Error', 'blocked by the browser', 'error blocked by the browser'],
  ])('exposes an error when the storage fails with %s', async (_, failure, shown) => {
    const storage = new InMemoryStorage();
    vi.spyOn(storage, 'list').mockRejectedValue(failure);

    renderProvider(storage);

    expect(await screen.findByText(shown)).toBeInTheDocument();
  });

  it('exposes an error when a content cannot be read', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: 'A' }]);
    vi.spyOn(storage, 'readFile').mockRejectedValue(new Error('unreadable'));

    renderProvider(storage);

    expect(await screen.findByText('error unreadable')).toBeInTheDocument();
  });

  it('loads the files again on reload', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: 'A' }]);
    vi.spyOn(storage, 'list').mockRejectedValueOnce(new Error('blocked'));
    renderProvider(storage);
    await screen.findByText('error blocked');

    click('reload');

    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    expect(await screen.findByText('a.yaml=A')).toBeInTheDocument();
  });

  it('stores an updated file and exposes its new content', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a.yaml', content: 'A' },
      { kind: 'file', path: 'b.yaml', content: 'B' },
    ]);
    renderProvider(storage);
    await screen.findByText('a.yaml=A,b.yaml=B');

    click('update');

    expect(await screen.findByText('a.yaml=changed,b.yaml=B')).toBeInTheDocument();
    expect(await storage.readFile('a.yaml')).toBe('changed');
  });

  it('stores a created file, exposes it in path order with the parent folders it brings along', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a.yaml', content: 'A' },
      { kind: 'file', path: 'b.yaml', content: 'B' },
    ]);
    renderProvider(storage);
    await screen.findByText('a.yaml=A,b.yaml=B');

    click('create');

    expect(await screen.findByText('a.yaml=A,a/c.yaml=C,b.yaml=B')).toBeInTheDocument();
    expect(screen.getByTestId('folders')).toHaveTextContent(/^a$/);
    expect(await storage.readFile('a/c.yaml')).toBe('C');
  });

  it('keeps the files when a file with the same path exists', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a/c.yaml', content: 'X' }]);
    const create = vi.spyOn(storage, 'createFile');
    renderProvider(storage);
    await screen.findByText('a/c.yaml=X');

    click('create');

    await waitFor(() => {
      expect(create).toHaveBeenCalled();
    });
    await expect(create.mock.results[0].value).rejects.toThrow();
    expect(screen.getByTestId('state')).toHaveTextContent('a/c.yaml=X');
    expect(await storage.readFile('a/c.yaml')).toBe('X');
  });

  it('renames a file, exposes it in path order under its new path as id', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a.yaml', content: 'A' },
      { kind: 'file', path: 'b.yaml', content: 'B' },
    ]);
    renderProvider(storage);
    await screen.findByText('a.yaml=A,b.yaml=B');

    click('rename');

    expect(await screen.findByText('b.yaml=B,z.yaml=A')).toBeInTheDocument();
    expect(await storedPaths(storage)).toEqual(['b.yaml', 'z.yaml']);
  });

  it('keeps the files and passes the rejection on when renaming fails', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a.yaml', content: 'A' },
      { kind: 'file', path: 'z.yaml', content: 'Z' },
    ]);
    renderProvider(storage);
    await screen.findByText('a.yaml=A,z.yaml=Z');

    click('rename');

    // The rename field shows its error only because the context passes the rejection on
    expect(await screen.findByText('z.yaml already exists')).toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('a.yaml=A,z.yaml=Z');
    expect(await storedPaths(storage)).toEqual(['a.yaml', 'z.yaml']);
  });

  it('deletes a file and drops it from the files, keeping its folder', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a.yaml', content: 'A' },
      { kind: 'file', path: 'x/b.yaml', content: 'B' },
    ]);
    renderProvider(storage);
    await screen.findByText('a.yaml=A,x/b.yaml=B');

    click('delete file');

    expect(await screen.findByText('x/b.yaml=B')).toBeInTheDocument();
    expect(screen.getByTestId('folders')).toHaveTextContent(/^x$/);
    expect(await storedPaths(storage)).toEqual(['x/b.yaml']);
  });

  it('deletes a folder with its files and folders and keeps the others', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a.yaml', content: 'A' },
      { kind: 'file', path: 'a/b.yaml', content: 'B' },
      { kind: 'file', path: 'a/c/d.yaml', content: 'D' },
      { kind: 'folder', path: 'ab' },
    ]);
    renderProvider(storage);
    await screen.findByText('a.yaml=A,a/b.yaml=B,a/c/d.yaml=D');

    click('delete folder');

    expect(await screen.findByText('a.yaml=A')).toBeInTheDocument();
    expect(screen.getByTestId('folders')).toHaveTextContent(/^ab$/);
    expect(await storedPaths(storage)).toEqual(['a.yaml']);
  });

  it('keeps the files when deleting a folder fails', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a/b.yaml', content: 'B' }]);
    vi.spyOn(storage, 'removeFolder').mockRejectedValue(new Error('blocked'));
    renderProvider(storage);
    await screen.findByText('a/b.yaml=B');

    click('delete folder');

    await waitFor(() => {
      expect(storage.removeFolder).toHaveBeenCalledWith('a');
    });
    expect(screen.getByTestId('state')).toHaveTextContent('a/b.yaml=B');
    expect(screen.getByTestId('folders')).toHaveTextContent(/^a$/);
  });

  it('exposes the stored folders, also the empty ones, sorted by path', async () => {
    renderProvider(
      new InMemoryStorage([
        { kind: 'folder', path: 'b' },
        { kind: 'folder', path: 'a' },
      ]),
    );

    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent(/^a,b$/);
    });
  });

  it('stores a created folder and exposes it in path order', async () => {
    const storage = new InMemoryStorage([{ kind: 'folder', path: 'b' }]);
    renderProvider(storage);
    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent(/^b$/);
    });

    click('create folder');

    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent(/^a,a\/new,b$/);
    });
  });

  it('keeps the folders when the folder exists', async () => {
    const storage = new InMemoryStorage([{ kind: 'folder', path: 'a/new' }]);
    const create = vi.spyOn(storage, 'createFolder');
    renderProvider(storage);
    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent(/^a,a\/new$/);
    });

    click('create folder');

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith('a/new');
    });
    await expect(create.mock.results[0].value).rejects.toThrow();
    expect(screen.getByTestId('folders')).toHaveTextContent(/^a,a\/new$/);
  });

  it('renames a folder and exposes its files and folders at their new paths', async () => {
    const storage = new InMemoryStorage([
      { kind: 'file', path: 'a/b.yaml', content: 'B' },
      { kind: 'folder', path: 'a/empty' },
    ]);
    renderProvider(storage);
    await screen.findByText('a/b.yaml=B');

    click('rename folder');

    expect(await screen.findByText('z/b.yaml=B')).toBeInTheDocument();
    expect(screen.getByTestId('folders')).toHaveTextContent(/^z,z\/empty$/);
    expect(await storedPaths(storage)).toEqual(['z/b.yaml']);
  });

  it('rejects an update of a missing file and keeps the files', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'b.yaml', content: 'B' }]);
    const write = vi.spyOn(storage, 'writeFile');
    renderProvider(storage);
    await screen.findByText('b.yaml=B');

    click('update');

    await waitFor(() => {
      expect(write).toHaveBeenCalled();
    });
    await expect(write.mock.results[0].value).rejects.toThrow('The file a.yaml does not exist');
    expect(screen.getByTestId('state')).toHaveTextContent('b.yaml=B');
  });

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Consumer />)).toThrow('useFiles must be used within a FilesProvider');
  });
});
