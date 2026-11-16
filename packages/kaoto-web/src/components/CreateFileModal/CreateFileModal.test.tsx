import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { CreateFileModal } from './CreateFileModal';

const TEMPLATES: Record<string, string> = {
  'camel-route-yaml': '- route:\n    id: route-__KAOTO_ID__\n',
  'kamelet-source-yaml': 'kind: Kamelet\nmetadata:\n  name: kamelet-source-__KAOTO_ID__\n',
  'pipe-yaml': 'kind: Pipe\nmetadata:\n  name: pipe-__KAOTO_ID__\n',
};

/** Serves the catalog index, the templates manifest and the templates the way the catalog lays them out */
const serveCatalog = () => {
  const manifest = {
    catalogs: Object.fromEntries(Object.keys(TEMPLATES).map((name) => [name, { file: `${name}-hash.yaml` }])),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((url: URL) => {
      const { pathname } = url;
      if (pathname === '/camel-catalog/index.json') {
        return Promise.resolve(new Response(JSON.stringify({ starterTemplates: 'starter-templates/index-1.json' })));
      }
      if (pathname === '/camel-catalog/starter-templates/index-1.json') {
        return Promise.resolve(new Response(JSON.stringify(manifest)));
      }
      const name = /\/starter-templates\/(.+)-hash\.yaml$/.exec(pathname)?.[1];
      if (name && TEMPLATES[name]) return Promise.resolve(new Response(TEMPLATES[name]));
      return Promise.resolve(new Response(null, { status: 404 }));
    }),
  );
};

const onClose = vi.fn();

const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderModal = () =>
  render(
    <MemoryRouter initialEntries={['/workspace']}>
      {withFiles(
        <>
          <Routes>
            <Route path="*" element={<LocationDisplay />} />
          </Routes>
          <CreateFileModal onClose={onClose} />
        </>,
      )}
    </MemoryRouter>,
  );

const storedFiles = () => filesStore.getFiles();

describe('CreateFileModal', () => {
  beforeEach(() => {
    resetTestIndexedDB();
    serveCatalog();
    onClose.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the file types and starts with a Camel Route and a disabled Create button', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Create New File' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Camel Route' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Kamelet' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pipe' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('shows the path the file gets, with the extension of the selected type', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('File name'), 'orders');
    expect(screen.getByText('Creates orders.camel.yaml')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Kamelet' }));
    await user.type(screen.getByLabelText('Folder path (optional)'), '/kamelets/');
    expect(screen.getByText('Creates kamelets/orders.kamelet.yaml')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('tells what is wrong with the name or the folder', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('File name'), 'routes/orders');
    expect(screen.getByText('Enter the folder in the folder field')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('File name'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.type(screen.getByLabelText('Folder path (optional)'), '../outside');
    expect(screen.getByText('Use a folder path such as routes/orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('does not create a file whose path is taken', async () => {
    await storeTestFiles();
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Folder path (optional)'), 'integrations');
    await user.type(screen.getByLabelText('File name'), 'main-flow');

    expect(await screen.findByText('A file with this path already exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('creates the file from the starter template, closes and opens it', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.type(screen.getByLabelText('Folder path (optional)'), 'routes');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    const [file] = await storedFiles();
    expect(file.path).toBe('routes/orders.camel.yaml');
    expect(file.content).toMatch(/^- route:\n {4}id: route-\d{4}\n$/);
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent(`/workspace/file/${file.id}`);
    });
  });

  it('names a new Kamelet after its file', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('radio', { name: 'Kamelet' }));
    await user.type(screen.getByLabelText('File name'), 'my-source');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    const [file] = await storedFiles();
    expect(file.path).toBe('my-source.kamelet.yaml');
    expect(file.content).toBe('kind: Kamelet\nmetadata:\n  name: my-source\n');
  });

  it('creates a Pipe on Enter', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('radio', { name: 'Pipe' }));
    await user.type(screen.getByLabelText('File name'), 'orders{Enter}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect((await storedFiles()).map((file) => file.path)).toEqual(['orders.pipe.yaml']);
  });

  it('shows an error and stays open when the template cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
    );
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    expect(await screen.findByText('Could not create the file')).toBeInTheDocument();
    expect(screen.getByText('Could not load /camel-catalog/index.json (500)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(await storedFiles()).toEqual([]);
  });

  it('closes on Cancel without creating a file', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(await storedFiles()).toEqual([]);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByLabelText('File name'));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
