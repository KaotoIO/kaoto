import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { fileUrl } from '../routes/file-url';
import { FilesUiStoreProvider } from '../store/files/FilesUiStoreProvider';
import { InMemoryStorage } from '../test/in-memory-storage';
import { useActiveFile } from './useActiveFile';

const ShowActiveFile = () => {
  const { path, entry } = useActiveFile();
  return <p data-testid="active">{`${String(path)}|${entry ? `${entry.kind}:${entry.path}` : 'none'}`}</p>;
};

const renderAt = (url: string) =>
  render(
    <FilesUiStoreProvider storage={new InMemoryStorage([{ kind: 'file', path: 'a/b.yaml', content: '' }])}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/workspace" element={<ShowActiveFile />} />
          <Route path="/workspace/file/*" element={<ShowActiveFile />} />
        </Routes>
      </MemoryRouter>
    </FilesUiStoreProvider>,
  );

describe('useActiveFile', () => {
  it('finds the entry of the path in the URL once the files are loaded', async () => {
    renderAt(fileUrl('a/b.yaml'));

    expect(screen.getByTestId('active')).toHaveTextContent('a/b.yaml|none');
    expect(await screen.findByText('a/b.yaml|file:a/b.yaml')).toBeInTheDocument();
  });

  it('has no entry for a path that does not exist', async () => {
    renderAt(fileUrl('missing.yaml'));

    expect(await screen.findByText('missing.yaml|none')).toBeInTheDocument();
  });

  it('has no entry for a folder', async () => {
    renderAt(fileUrl('a'));

    // The folder is loaded by the time the file next to it is
    await screen.findByText('a|none');
    expect(screen.getByTestId('active')).toHaveTextContent('a|none');
  });

  it('has neither a path nor an entry without a file route', () => {
    renderAt('/workspace');

    expect(screen.getByTestId('active')).toHaveTextContent('undefined|none');
  });
});
