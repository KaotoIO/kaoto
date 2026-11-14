import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent } from 'react';

import { useProjectFiles } from '../hooks/useProjectFiles';
import { NewProjectFile, ProjectFile } from '../services/project-files/project-file';
import { ProjectFilesStore } from '../services/project-files/project-files.store';
import { resetTestIndexedDB } from '../test/indexed-db';
import { ProjectFilesProvider } from './ProjectFilesContext';

const SEED: NewProjectFile[] = [
  { id: 'seeded-a', path: 'a.camel.yaml', type: 'integration', content: 'A' },
  { id: 'seeded-b', path: 'b.camel.yaml', type: 'integration', content: 'B' },
];

/** Every value the consumer rendered, as `<projectId>:<loading|error|ids>` */
let renders: string[] = [];

const Consumer: FunctionComponent<{ projectId: string }> = ({ projectId }) => {
  const { files, loading, error, reload } = useProjectFiles();
  let state = files.map((file) => file.id).join(',');
  if (loading) state = 'loading';
  if (error) state = `error ${error.message}`;
  renders.push(`${projectId}:${state}`);
  return (
    <>
      <div data-testid="state">{state}</div>
      <button onClick={reload}>reload</button>
    </>
  );
};

const renderProvider = (projectId: string, store: ProjectFilesStore) =>
  render(
    <ProjectFilesProvider projectId={projectId} store={store} seed={SEED}>
      <Consumer projectId={projectId} />
    </ProjectFilesProvider>,
  );

describe('ProjectFilesProvider', () => {
  let store: ProjectFilesStore;

  beforeEach(() => {
    resetTestIndexedDB();
    store = new ProjectFilesStore();
    renders = [];
  });

  afterEach(() => {
    store.close();
  });

  it('starts loading and then exposes the seeded files', async () => {
    renderProvider('p1', store);

    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    expect(await screen.findByText('seeded-a,seeded-b')).toBeInTheDocument();
  });

  it('exposes the stored files of a project that already has files', async () => {
    await store.createFile('p1', { id: 'own', path: 'own.camel.yaml', type: 'integration', content: '' });

    renderProvider('p1', store);

    expect(await screen.findByText('own')).toBeInTheDocument();
  });

  it('exposes an error when the store fails', async () => {
    vi.spyOn(store, 'seedIfEmpty').mockRejectedValue(new Error('blocked'));

    renderProvider('p1', store);

    expect(await screen.findByText('error blocked')).toBeInTheDocument();
  });

  it('turns a failure that is not an Error into an error', async () => {
    vi.spyOn(store, 'seedIfEmpty').mockRejectedValue('blocked by the browser');

    renderProvider('p1', store);

    expect(await screen.findByText('error blocked by the browser')).toBeInTheDocument();
  });

  it('loads the files again on reload', async () => {
    vi.spyOn(store, 'seedIfEmpty').mockRejectedValueOnce(new Error('blocked'));
    renderProvider('p1', store);
    await screen.findByText('error blocked');

    fireEvent.click(screen.getByRole('button', { name: 'reload' }));

    expect(screen.getByTestId('state')).toHaveTextContent('loading');
    expect(await screen.findByText('seeded-a,seeded-b')).toBeInTheDocument();
  });

  it('shows the files of the new project after switching projects', async () => {
    await store.createFile('p2', { id: 'only-in-p2', path: 'p2.camel.yaml', type: 'integration', content: '' });
    const { rerender } = renderProvider('p1', store);
    await screen.findByText('seeded-a,seeded-b');

    rerender(
      <ProjectFilesProvider projectId="p2" store={store} seed={SEED}>
        <Consumer projectId="p2" />
      </ProjectFilesProvider>,
    );

    expect(await screen.findByText('only-in-p2')).toBeInTheDocument();
    expect(renders.filter((entry) => entry.startsWith('p2:'))).not.toContain('p2:seeded-a,seeded-b');
  });

  it('ignores a result that arrives after switching projects', async () => {
    let resolveP1: (files: ProjectFile[]) => void = () => {};
    vi.spyOn(store, 'seedIfEmpty').mockImplementation((projectId) =>
      projectId === 'p1'
        ? new Promise((resolve) => {
            resolveP1 = resolve;
          })
        : Promise.resolve([]),
    );
    const { rerender } = renderProvider('p1', store);
    rerender(
      <ProjectFilesProvider projectId="p2" store={store} seed={SEED}>
        <Consumer projectId="p2" />
      </ProjectFilesProvider>,
    );
    await waitFor(() => {
      expect(renders).toContain('p2:');
    });

    await act(async () => {
      resolveP1([
        { projectId: 'p1', id: 'late-p1', path: 'late.yaml', type: 'integration', content: '', updatedAt: 0 },
      ]);
    });

    expect(renders[renders.length - 1]).toBe('p2:');
  });

  it('throws when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<Consumer projectId="p1" />)).toThrow(
      'useProjectFiles must be used within a ProjectFilesProvider',
    );
  });
});
