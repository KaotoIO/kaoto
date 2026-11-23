import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { fileUrl } from '../../routes/file-url';
import { FilesUiStoreProvider } from '../../store/files/FilesUiStoreProvider';
import { useFilesUiStoreApi } from '../../store/files/use-files-ui-store';
import { InMemoryStorage } from '../../test/in-memory-storage';
import { OpenFile } from './editors/open-file';
import { useOpenFile } from './useOpenFile';
import { useOpenFileContent } from './useOpenFileContent';

const ShownFile = ({ onShown }: { onShown: (file: OpenFile | undefined) => void }) => {
  const { shown, loading, error } = useOpenFileContent(useOpenFile());
  const navigate = useNavigate();
  const store = useFilesUiStoreApi();
  useEffect(() => {
    onShown(shown);
  }, [shown, onShown]);
  return (
    <>
      <p data-testid="shown">{shown ? `${shown.path}=${shown.content}` : 'nothing'}</p>
      <p data-testid="state">{error ? `error ${error.message}` : String(loading)}</p>
      {['a.yaml', 'b.yaml', 'c.yaml', 'missing.yaml'].map((path) => (
        <button key={path} onClick={() => void navigate(fileUrl(path))}>
          {path}
        </button>
      ))}
      <button
        onClick={() => {
          const key = store.getState().entries.find((candidate) => candidate.path === 'a.yaml')!.key;
          void store.getState().moveFile(key, 'renamed.yaml');
        }}
      >
        rename a
      </button>
    </>
  );
};

const renderAt = (path: string) => {
  const storage = new InMemoryStorage([
    { kind: 'file', path: 'a.yaml', content: 'A' },
    { kind: 'file', path: 'b.yaml', content: 'B' },
    { kind: 'file', path: 'c.yaml', content: 'C' },
  ]);
  const onShown = vi.fn();
  render(
    <FilesUiStoreProvider storage={storage}>
      <MemoryRouter initialEntries={[fileUrl(path)]}>
        <Routes>
          <Route path="/workspace/file/*" element={<ShownFile onShown={onShown} />} />
        </Routes>
      </MemoryRouter>
    </FilesUiStoreProvider>,
  );
  return { storage, onShown };
};

const shown = () => screen.getByTestId('shown').textContent;

describe('useOpenFileContent', () => {
  it('shows nothing and is loading until the first content arrived', async () => {
    const { storage } = renderAt('a.yaml');
    const reads = storage.delayReads();

    expect(await screen.findByText('true')).toHaveAttribute('data-testid', 'state');
    expect(shown()).toBe('nothing');

    reads.release();
    expect(await screen.findByText('a.yaml=A')).toBeInTheDocument();
    expect(screen.getByTestId('state')).toHaveTextContent('false');
  });

  it('keeps the previous file until the content of the next one arrived', async () => {
    const user = userEvent.setup();
    const { storage } = renderAt('a.yaml');
    await screen.findByText('a.yaml=A');
    const reads = storage.delayReads();

    await user.click(screen.getByRole('button', { name: 'b.yaml' }));

    expect(shown()).toBe('a.yaml=A');
    expect(screen.getByTestId('state')).toHaveTextContent('true');
    reads.release();
    expect(await screen.findByText('b.yaml=B')).toBeInTheDocument();
  });

  it('drops a late content of a file that is no longer open', async () => {
    const user = userEvent.setup();
    const { storage, onShown } = renderAt('a.yaml');
    await screen.findByText('a.yaml=A');
    const readOfB = storage.delayReads();
    await user.click(screen.getByRole('button', { name: 'b.yaml' }));
    const readOfC = storage.delayReads();
    await user.click(screen.getByRole('button', { name: 'c.yaml' }));

    readOfC.release();
    await screen.findByText('c.yaml=C');
    readOfB.release();
    await act(() => Promise.resolve());

    expect(shown()).toBe('c.yaml=C');
    expect(onShown.mock.calls.map(([file]) => (file as OpenFile | undefined)?.path)).not.toContain('b.yaml');
  });

  it('shows nothing for a path without a file, and loads the next file afresh', async () => {
    const user = userEvent.setup();
    const { storage } = renderAt('a.yaml');
    await screen.findByText('a.yaml=A');

    await user.click(screen.getByRole('button', { name: 'missing.yaml' }));
    expect(shown()).toBe('nothing');

    const reads = storage.delayReads();
    await user.click(screen.getByRole('button', { name: 'b.yaml' }));
    expect(shown()).toBe('nothing');
    reads.release();
    expect(await screen.findByText('b.yaml=B')).toBeInTheDocument();
  });

  it('reports a content that cannot be read', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: 'A' }]);
    vi.spyOn(storage, 'readFile').mockRejectedValueOnce(new Error('unreadable'));
    render(
      <FilesUiStoreProvider storage={storage}>
        <MemoryRouter initialEntries={[fileUrl('a.yaml')]}>
          <Routes>
            <Route path="/workspace/file/*" element={<ShownFile onShown={vi.fn()} />} />
          </Routes>
        </MemoryRouter>
      </FilesUiStoreProvider>,
    );

    expect(await screen.findByText('error unreadable')).toBeInTheDocument();
    expect(shown()).toBe('nothing');
  });

  it('shows the new path of the renamed open file without reading it again', async () => {
    const user = userEvent.setup();
    const { storage, onShown } = renderAt('a.yaml');
    await screen.findByText('a.yaml=A');
    const read = vi.spyOn(storage, 'readFile');
    onShown.mockClear();

    await user.click(screen.getByRole('button', { name: 'rename a' }));

    expect(await screen.findByText('renamed.yaml=A')).toBeInTheDocument();
    expect(read).not.toHaveBeenCalled();
    expect(onShown).not.toHaveBeenCalledWith(undefined);
  });
});
