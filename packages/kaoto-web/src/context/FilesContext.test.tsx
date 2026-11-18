import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, useState } from 'react';

import { useFiles } from '../hooks/useFiles';
import { FilesStore } from '../services/files/files.store';
import { resetTestIndexedDB } from '../test/indexed-db';
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
      <div data-testid="paths">{files.map((file) => file.path).join(',')}</div>
      <div data-testid="rename-error">{renameError}</div>
      <div data-testid="folders">{folders.join(',')}</div>
      <button onClick={reload}>reload</button>
      <button onClick={() => void updateFile('a', 'changed').catch(() => undefined)}>update</button>
      <button onClick={() => void createFile({ id: 'c', path: 'a/c.camel.yaml', content: 'C' }).catch(() => undefined)}>
        create
      </button>
      <button
        onClick={() =>
          void renameFile('a', 'z.camel.yaml').catch((renameFailure: unknown) => {
            setRenameError(renameFailure instanceof Error ? renameFailure.message : String(renameFailure));
          })
        }
      >
        rename
      </button>
      <button onClick={() => void deleteFile('a').catch(() => undefined)}>delete file</button>
      <button onClick={() => void deleteFolder('a').catch(() => undefined)}>delete folder</button>
      <button onClick={() => void createFolder('a/new').catch(() => undefined)}>create folder</button>
      <button onClick={() => void renameFolder('a', 'z').catch(() => undefined)}>rename folder</button>
    </>
  );
};

const renderProvider = (store: FilesStore) =>
  render(
    <FilesProvider store={store}>
      <Consumer />
    </FilesProvider>,
  );

describe('FilesProvider', () => {
  let store: FilesStore;

  beforeEach(() => {
    resetTestIndexedDB();
    store = new FilesStore();
  });

  afterEach(() => {
    store.close();
  });

  it('starts loading and then exposes no files when nothing is stored', async () => {
    renderProvider(store);

    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    await waitFor(() => {
      expect(screen.getByTestId('state')).toBeEmptyDOMElement();
    });
  });

  it('exposes the stored files', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });

    renderProvider(store);

    expect(await screen.findByText('a=A')).toBeInTheDocument();
  });

  it('exposes an error when the store fails', async () => {
    vi.spyOn(store, 'getFiles').mockRejectedValue(new Error('blocked'));

    renderProvider(store);

    expect(await screen.findByText('error blocked')).toBeInTheDocument();
  });

  it('turns a failure that is not an Error into an error', async () => {
    vi.spyOn(store, 'getFiles').mockRejectedValue('blocked by the browser');

    renderProvider(store);

    expect(await screen.findByText('error blocked by the browser')).toBeInTheDocument();
  });

  it('loads the files again on reload', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });
    vi.spyOn(store, 'getFiles').mockRejectedValueOnce(new Error('blocked'));
    renderProvider(store);
    await screen.findByText('error blocked');

    fireEvent.click(screen.getByRole('button', { name: 'reload' }));

    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    expect(await screen.findByText('a=A')).toBeInTheDocument();
  });

  it('stores an updated file and exposes its new content', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });
    await store.createFile({ id: 'b', path: 'b.camel.yaml', content: 'B' });
    renderProvider(store);
    await screen.findByText('a=A,b=B');

    fireEvent.click(screen.getByRole('button', { name: 'update' }));

    expect(await screen.findByText('a=changed,b=B')).toBeInTheDocument();
    expect((await store.getFiles()).map((file) => file.content)).toEqual(['changed', 'B']);
  });

  it('stores a created file and exposes it in path order', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });
    await store.createFile({ id: 'b', path: 'b.camel.yaml', content: 'B' });
    renderProvider(store);
    await screen.findByText('a=A,b=B');

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    expect(await screen.findByText('a=A,c=C,b=B')).toBeInTheDocument();
    expect((await store.getFiles()).map((file) => file.id)).toEqual(['a', 'c', 'b']);
  });

  it('keeps the files when a file with the same path exists', async () => {
    await store.createFile({ id: 'other', path: 'a/c.camel.yaml', content: 'X' });
    renderProvider(store);
    await screen.findByText('other=X');

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(async () => {
      expect(await store.getFiles()).toHaveLength(1);
    });
    expect(screen.getByTestId('state')).toHaveTextContent('other=X');
  });

  it('renames a file and exposes it in path order', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });
    await store.createFile({ id: 'b', path: 'b.camel.yaml', content: 'B' });
    renderProvider(store);
    await screen.findByText('a=A,b=B');

    fireEvent.click(screen.getByRole('button', { name: 'rename' }));

    expect(await screen.findByText('b=B,a=A')).toBeInTheDocument();
    expect((await store.getFiles()).map((file) => file.path)).toEqual(['b.camel.yaml', 'z.camel.yaml']);
  });

  it('keeps the files when renaming fails', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });
    await store.createFile({ id: 'z', path: 'z.camel.yaml', content: 'Z' });
    const rename = vi.spyOn(store, 'renameFile');
    renderProvider(store);
    await screen.findByText('a=A,z=Z');

    fireEvent.click(screen.getByRole('button', { name: 'rename' }));

    await waitFor(() => {
      expect(rename).toHaveBeenCalledWith('a', 'z.camel.yaml');
    });
    await expect(rename.mock.results[0].value).rejects.toThrow();
    // The rename field shows its error only because the context passes the rejection on
    await waitFor(() => {
      expect(screen.getByTestId('rename-error')).not.toBeEmptyDOMElement();
    });
    expect((await store.getFiles()).map((file) => file.path)).toEqual(['a.camel.yaml', 'z.camel.yaml']);
    expect(screen.getByTestId('paths').textContent).toBe('a.camel.yaml,z.camel.yaml');
    expect(screen.getByTestId('state')).toHaveTextContent('a=A,z=Z');
  });

  it('deletes a file and drops it from the files', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });
    await store.createFile({ id: 'b', path: 'b.camel.yaml', content: 'B' });
    renderProvider(store);
    await screen.findByText('a=A,b=B');

    fireEvent.click(screen.getByRole('button', { name: 'delete file' }));

    expect(await screen.findByText('b=B')).toBeInTheDocument();
    expect((await store.getFiles()).map((file) => file.id)).toEqual(['b']);
  });

  it('deletes the files of a folder and drops them from the files', async () => {
    await store.createFile({ id: 'a', path: 'a.camel.yaml', content: 'A' });
    await store.createFile({ id: 'b', path: 'a/b.camel.yaml', content: 'B' });
    await store.createFile({ id: 'c', path: 'a/c/d.camel.yaml', content: 'C' });
    renderProvider(store);
    await screen.findByText('a=A,b=B,c=C');

    fireEvent.click(screen.getByRole('button', { name: 'delete folder' }));

    expect(await screen.findByText('a=A')).toBeInTheDocument();
    expect((await store.getFiles()).map((file) => file.id)).toEqual(['a']);
  });

  it('exposes the stored folders', async () => {
    await store.createFolder('b');
    await store.createFolder('a');

    renderProvider(store);

    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent('a,b');
    });
  });

  it('exposes an error when the folders cannot be loaded', async () => {
    vi.spyOn(store, 'getFolders').mockRejectedValue(new Error('blocked'));

    renderProvider(store);

    expect(await screen.findByText('error blocked')).toBeInTheDocument();
  });

  it('stores a created folder and exposes it in path order', async () => {
    await store.createFolder('b');
    renderProvider(store);
    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent('b');
    });

    fireEvent.click(screen.getByRole('button', { name: 'create folder' }));

    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent('a,a/new,b');
    });
    expect(await store.getFolders()).toEqual(['a', 'a/new', 'b']);
  });

  it('exposes the parent folders a created file brings along', async () => {
    renderProvider(store);
    await waitFor(() => {
      expect(screen.getByTestId('state')).toBeEmptyDOMElement();
    });

    fireEvent.click(screen.getByRole('button', { name: 'create' }));

    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent(/^a$/);
    });
  });

  it('keeps a folder after its last file is deleted', async () => {
    await store.createFile({ id: 'a', path: 'x/a.camel.yaml', content: 'A' });
    renderProvider(store);
    await screen.findByText('a=A');

    fireEvent.click(screen.getByRole('button', { name: 'delete file' }));

    await waitFor(() => {
      expect(screen.getByTestId('state')).toBeEmptyDOMElement();
    });
    expect(screen.getByTestId('folders')).toHaveTextContent(/^x$/);
  });

  it('keeps the folders when the folder exists', async () => {
    await store.createFolder('a/new');
    const create = vi.spyOn(store, 'createFolder');
    renderProvider(store);
    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent('a/new');
    });

    fireEvent.click(screen.getByRole('button', { name: 'create folder' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith('a/new');
    });
    await expect(create.mock.results[0].value).rejects.toThrow();
    expect(screen.getByTestId('folders')).toHaveTextContent(/^a,a\/new$/);
  });

  it('renames a folder and exposes its files and folders at their new paths', async () => {
    await store.createFile({ id: 'b', path: 'a/b.camel.yaml', content: 'B' });
    await store.createFolder('a/empty');
    renderProvider(store);
    await screen.findByText('b=B');

    fireEvent.click(screen.getByRole('button', { name: 'rename folder' }));

    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent(/^z,z\/empty$/);
    });
    expect((await store.getFiles()).map(({ path }) => path)).toEqual(['z/b.camel.yaml']);
  });

  it('drops the folders under a deleted folder and keeps the others', async () => {
    for (const path of ['a', 'a/c', 'ab']) await store.createFolder(path);
    renderProvider(store);
    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent('a,a/c,ab');
    });

    fireEvent.click(screen.getByRole('button', { name: 'delete folder' }));

    await waitFor(() => {
      expect(screen.getByTestId('folders')).toHaveTextContent(/^ab$/);
    });
  });

  it('keeps the files when deleting a folder fails', async () => {
    await store.createFile({ id: 'b', path: 'a/b.camel.yaml', content: 'B' });
    vi.spyOn(store, 'deleteFolder').mockRejectedValue(new Error('blocked'));
    renderProvider(store);
    await screen.findByText('b=B');

    fireEvent.click(screen.getByRole('button', { name: 'delete folder' }));

    await waitFor(() => {
      expect(store.deleteFolder).toHaveBeenCalledWith('a');
    });
    expect(screen.getByTestId('state')).toHaveTextContent('b=B');
  });

  it('rejects an update of a missing file and keeps the files', async () => {
    await store.createFile({ id: 'b', path: 'b.camel.yaml', content: 'B' });
    const UpdateMissing = () => {
      const { updateFile } = useFiles();
      const [failure, setFailure] = useState('');
      return (
        <button
          onClick={() => {
            updateFile('missing', 'x').catch((error: Error) => {
              setFailure(error.message);
            });
          }}
        >
          {failure || 'update missing'}
        </button>
      );
    };
    render(
      <FilesProvider store={store}>
        <UpdateMissing />
        <Consumer />
      </FilesProvider>,
    );
    await screen.findByText('b=B');

    fireEvent.click(screen.getByRole('button', { name: 'update missing' }));

    expect(await screen.findByRole('button', { name: 'The file missing does not exist' })).toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('b=B');
  });

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Consumer />)).toThrow('useFiles must be used within a FilesProvider');
  });
});
