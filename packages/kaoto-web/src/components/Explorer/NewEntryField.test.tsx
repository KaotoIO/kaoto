import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { toFolderId } from './build-tree';
import { NewEntryField, NewEntryKind } from './NewEntryField';

/** Serves the catalog index, the starter templates manifest and the Camel route template */
const serveCatalog = (catalogs: Record<string, { file: string }> = { 'camel-route-yaml': { file: 'route.yaml' } }) =>
  vi.fn((url: URL) => {
    const { pathname } = url;
    if (pathname === '/camel-catalog/index.json') {
      return Promise.resolve(new Response(JSON.stringify({ starterTemplates: 'starter-templates/index-1.json' })));
    }
    if (pathname === '/camel-catalog/starter-templates/index-1.json') {
      return Promise.resolve(new Response(JSON.stringify({ catalogs })));
    }
    return Promise.resolve(new Response('- route:\n    id: route-__KAOTO_ID__\n'));
  });

describe('NewEntryField', () => {
  const onDone = vi.fn();
  let fetchMock: ReturnType<typeof serveCatalog>;

  beforeEach(async () => {
    resetTestIndexedDB();
    await storeTestFiles([{ id: 'main-flow', path: 'integrations/main-flow.camel.yaml', content: 'x' }]);
    fetchMock = serveCatalog();
    vi.stubGlobal('fetch', fetchMock);
    onDone.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const renderField = (kind: NewEntryKind, folderPath = 'integrations') => {
    render(withFiles(<NewEntryField kind={kind} folderPath={folderPath} onDone={onDone} />));
    return screen.getByTestId('explorer-new-input') as HTMLInputElement;
  };

  const storedFile = async (path: string) => (await filesStore.getFiles()).find((file) => file.path === path);

  it.each([
    ['file', 'New file name'],
    ['folder', 'New folder name'],
  ] as const)('opens an empty, focused %s field', (kind, label) => {
    const input = renderField(kind);

    expect(input).toHaveAccessibleName(label);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('creates a file of a known kind from its starter template and reports it', async () => {
    const user = userEvent.setup();
    renderField('file');

    await user.keyboard('orders.camel.yaml{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledTimes(1);
    });
    const file = await storedFile('integrations/orders.camel.yaml');
    expect(fetchMock.mock.calls.map(([url]) => url.pathname)).toContain('/camel-catalog/starter-templates/route.yaml');
    expect(file?.content).toMatch(/^- route:\n {4}id: route-\d{4}\n$/);
    expect(onDone).toHaveBeenCalledWith(true, {
      id: 'integrations/orders.camel.yaml',
      path: 'integrations/orders.camel.yaml',
    });
  });

  it('creates a file of another kind empty, without loading a template', async () => {
    const user = userEvent.setup();
    renderField('file');

    await user.keyboard('notes.md{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledTimes(1);
    });
    expect((await storedFile('integrations/notes.md'))?.content).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a folder and reports its tree node id', async () => {
    const user = userEvent.setup();
    renderField('folder');

    await user.keyboard('routes{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true, { id: toFolderId('integrations/routes'), path: 'integrations/routes' });
    });
    expect(await filesStore.getFolders()).toContain('integrations/routes');
  });

  it('creates the entry at the root when no folder is given', async () => {
    const user = userEvent.setup();
    renderField('folder', '');

    await user.keyboard('resources{Enter}');

    await waitFor(() => {
      expect(onDone).toHaveBeenCalledWith(true, { id: toFolderId('resources'), path: 'resources' });
    });
  });

  it('keeps the field open with an error for a name that is taken', async () => {
    const create = vi.spyOn(filesStore, 'createFile');
    const user = userEvent.setup();
    renderField('file');

    await user.keyboard('main-flow.camel.yaml{Enter}');

    expect(screen.getByText('A file or folder with that name already exists')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps the field open with an error for an empty name', async () => {
    const user = userEvent.setup();
    renderField('folder');

    await user.keyboard('{Enter}');

    expect(screen.getByRole('textbox', { name: 'New folder name' })).toBeInvalid();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('reports a cancelled entry without creating anything', async () => {
    const create = vi.spyOn(filesStore, 'createFolder');
    const user = userEvent.setup();
    renderField('folder');

    await user.keyboard('routes{Escape}');

    expect(onDone).toHaveBeenCalledWith(true, undefined);
    expect(create).not.toHaveBeenCalled();
  });

  it('shows a template that cannot be loaded and stays open', async () => {
    vi.stubGlobal('fetch', serveCatalog({}));
    const user = userEvent.setup();
    renderField('file');

    await user.keyboard('orders.camel.yaml{Enter}');

    expect(await screen.findByText('The catalog has no starter template camel-route-yaml')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
    expect(await storedFile('integrations/orders.camel.yaml')).toBeUndefined();
  });
});
