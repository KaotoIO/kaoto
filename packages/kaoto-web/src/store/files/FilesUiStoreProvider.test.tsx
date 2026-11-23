import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryStorage } from '../../test/in-memory-storage';
import { FilesUiStoreProvider } from './FilesUiStoreProvider';
import { useFilesUiStore } from './use-files-ui-store';

const Paths = ({ testId }: { testId: string }) => {
  const entries = useFilesUiStore((state) => state.entries);
  return <p data-testid={testId}>{entries.map(({ path }) => path).join(',')}</p>;
};

describe('FilesUiStoreProvider', () => {
  it('loads the files of its storage once it is mounted', async () => {
    const storage = new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: '' }]);
    const list = vi.spyOn(storage, 'list');

    render(
      <FilesUiStoreProvider storage={storage}>
        <Paths testId="paths" />
      </FilesUiStoreProvider>,
    );

    expect(await screen.findByText('a.yaml')).toBeInTheDocument();
    expect(list).toHaveBeenCalled();
  });

  it('gives every provider a store of its own', async () => {
    render(
      <>
        <FilesUiStoreProvider storage={new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: '' }])}>
          <Paths testId="first" />
        </FilesUiStoreProvider>
        <FilesUiStoreProvider storage={new InMemoryStorage([{ kind: 'file', path: 'b.yaml', content: '' }])}>
          <Paths testId="second" />
        </FilesUiStoreProvider>
      </>,
    );

    expect(await screen.findByText('a.yaml')).toHaveAttribute('data-testid', 'first');
    expect(await screen.findByText('b.yaml')).toHaveAttribute('data-testid', 'second');
  });

  it('builds a new store with the files of a new storage', async () => {
    const { rerender } = render(
      <FilesUiStoreProvider storage={new InMemoryStorage([{ kind: 'file', path: 'a.yaml', content: '' }])}>
        <Paths testId="paths" />
      </FilesUiStoreProvider>,
    );
    await screen.findByText('a.yaml');

    rerender(
      <FilesUiStoreProvider storage={new InMemoryStorage([{ kind: 'file', path: 'b.yaml', content: '' }])}>
        <Paths testId="paths" />
      </FilesUiStoreProvider>,
    );

    expect(await screen.findByText('b.yaml')).toBeInTheDocument();
  });
});
