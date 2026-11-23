import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InMemoryStorage } from '../../test/in-memory-storage';
import { FilesUiStoreProvider } from './FilesUiStoreProvider';
import { useFilesUiStore, useFilesUiStoreApi } from './use-files-ui-store';

const Paths = ({ testId }: { testId: string }) => {
  const entries = useFilesUiStore((state) => state.entries);
  return <p data-testid={testId}>{entries.map(({ path }) => path).join(',')}</p>;
};

describe('useFilesUiStore', () => {
  it('throws outside a FilesUiStoreProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Paths testId="paths" />)).toThrow(
      'useFilesUiStore must be used within a FilesUiStoreProvider',
    );
  });

  it('renders again only when the selected value changes', async () => {
    let renders = 0;
    const Status = () => {
      renders++;
      return <p data-testid="status">{useFilesUiStore((state) => state.status)}</p>;
    };
    const AddFile = () => {
      const store = useFilesUiStoreApi();
      return <button onClick={() => void store.getState().addFile('a.yaml', '')}>add</button>;
    };
    render(
      <FilesUiStoreProvider storage={new InMemoryStorage()}>
        <Status />
        <AddFile />
        <Paths testId="paths" />
      </FilesUiStoreProvider>,
    );
    await screen.findByText('ready');
    const rendersWhenReady = renders;

    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    await screen.findByText('a.yaml');

    expect(renders).toBe(rendersWhenReady);
  });
});
