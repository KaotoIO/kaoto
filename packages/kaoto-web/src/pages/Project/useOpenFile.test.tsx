import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { fileUrl } from '../../routes/file-url';
import { FilesUiStoreApi } from '../../store/files/files-ui-store';
import { FilesUiStoreProvider } from '../../store/files/FilesUiStoreProvider';
import { useFilesUiStore, useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { InMemoryStorage } from '../../test/in-memory-storage';
import { useOpenFile } from './useOpenFile';

const Follower = () => {
  const entry = useOpenFile();
  return <p data-testid="open">{entry?.path ?? 'none'}</p>;
};

/** Shows the location and the load status, and runs a change on the store or the router on a click */
const Controls = ({ change }: { change?: (store: FilesUiStoreApi) => Promise<unknown> }) => {
  const store = useFilesUiStoreApi();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const status = useFilesUiStore((state) => state.status);
  return (
    <>
      <p data-testid="location">{pathname}</p>
      <p data-testid="status">{status}</p>
      <button onClick={() => void change?.(store).catch(() => undefined)}>change</button>
      <button onClick={() => void navigate(fileUrl('missing.yaml'))}>open missing</button>
    </>
  );
};

const keyAt = (store: FilesUiStoreApi, path: string) =>
  store.getState().entries.find((entry) => entry.path === path)!.key;

const renderAt = (url: string, change?: (store: FilesUiStoreApi) => Promise<unknown>, storage = newAdapter()) => {
  render(
    <FilesUiStoreProvider storage={storage}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/workspace" element={<Controls change={change} />} />
          <Route
            path="/workspace/file/*"
            element={
              <>
                <Follower />
                <Controls change={change} />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </FilesUiStoreProvider>,
  );
  return storage;
};

const newAdapter = () =>
  new InMemoryStorage([
    { kind: 'file', path: 'a/f.yaml', content: '' },
    { kind: 'file', path: 'other.yaml', content: '' },
  ]);

const location = () => screen.getByTestId('location').textContent;

describe('useOpenFile', () => {
  it.each<[string, (store: FilesUiStoreApi) => Promise<unknown>, string]>([
    [
      'the open file is renamed',
      (store) => store.getState().moveFile(keyAt(store, 'a/f.yaml'), 'a/g.yaml'),
      'a/g.yaml',
    ],
    ['a folder above it is renamed', (store) => store.getState().moveFolder(keyAt(store, 'a'), 'b/c'), 'b/c/f.yaml'],
  ])('follows the open file when %s', async (_, change, newPath) => {
    const user = userEvent.setup();
    renderAt(fileUrl('a/f.yaml'), change);
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'change' }));

    expect(await screen.findByText(fileUrl(newPath))).toBeInTheDocument();
    expect(screen.getByTestId('open')).toHaveTextContent(newPath);
  });

  it.each<[string, (store: FilesUiStoreApi) => Promise<unknown>]>([
    ['the open file is removed', (store) => store.getState().removeFile(keyAt(store, 'a/f.yaml'))],
    ['a folder above it is removed', (store) => store.getState().removeFolder(keyAt(store, 'a'))],
  ])('leads to the workspace when %s', async (_, change) => {
    const user = userEvent.setup();
    renderAt(fileUrl('a/f.yaml'), change);
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'change' }));

    expect(await screen.findByText('/workspace')).toBeInTheDocument();
  });

  it('stays on the file when another file is removed', async () => {
    const user = userEvent.setup();
    renderAt(fileUrl('a/f.yaml'), (store) => store.getState().removeFile(keyAt(store, 'other.yaml')));
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'change' }));

    await act(() => Promise.resolve());
    expect(location()).toBe(fileUrl('a/f.yaml'));
  });

  it('stays on the file while loading fails and after loading again', async () => {
    const user = userEvent.setup();
    const storage = newAdapter();
    vi.spyOn(storage, 'list')
      .mockImplementationOnce(() => InMemoryStorage.prototype.list.call(storage))
      .mockRejectedValueOnce(new Error('blocked'));
    renderAt(fileUrl('a/f.yaml'), (store) => store.getState().load(), storage);
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'change' }));
    await screen.findByText('error');
    expect(location()).toBe(fileUrl('a/f.yaml'));

    await user.click(screen.getByRole('button', { name: 'change' }));
    await screen.findByText('ready');
    expect(location()).toBe(fileUrl('a/f.yaml'));
  });

  it('is the file at the path in the URL once the files are loaded', async () => {
    renderAt(fileUrl('a/f.yaml'));

    expect(screen.getByTestId('open')).toHaveTextContent('none');
    expect(await screen.findByText('a/f.yaml')).toHaveAttribute('data-testid', 'open');
  });

  it('stays on a path without a file, also when a file was open before', async () => {
    const user = userEvent.setup();
    renderAt(fileUrl('a/f.yaml'));
    await screen.findByText('ready');

    await user.click(screen.getByRole('button', { name: 'open missing' }));

    await act(() => Promise.resolve());
    expect(location()).toBe(fileUrl('missing.yaml'));
    expect(screen.getByTestId('open')).toHaveTextContent('none');
  });
});
