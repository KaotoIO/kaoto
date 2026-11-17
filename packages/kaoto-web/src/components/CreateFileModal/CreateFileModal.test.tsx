import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { CreateFileModal } from './CreateFileModal';

const TEMPLATES: Record<string, string> = {
  'camel-route-yaml': '- route:\n    id: route-__KAOTO_ID__\n',
  'camel-route-xml': '<routes>\n  <route id="route-__KAOTO_ID__"/>\n</routes>\n',
  'kamelet-source-yaml': 'kind: Kamelet\nmetadata:\n  name: kamelet-source-__KAOTO_ID__\n',
  'citrus-yaml': 'name: myTest.citrus\nactions: []\n',
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

const fileType = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });

describe('CreateFileModal', () => {
  beforeEach(() => {
    resetTestIndexedDB();
    serveCatalog();
    onClose.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the file types without a preselection, and the name only after a type is chosen', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Create New File' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'File type' })).toBeInTheDocument();
    for (const type of ['Camel Route YAML', 'Camel Route XML', 'Kamelet', 'Citrus Test']) {
      expect(fileType(type)).not.toBeChecked();
    }
    expect(screen.queryByRole('radio', { name: /^Pipe/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('File name')).toBeDisabled();
    expect(screen.getByLabelText('Folder path (optional)')).toBeDisabled();
    expect(screen.getByLabelText('File name')).toHaveAttribute('placeholder', 'Select a file type first');
    expect(screen.getByRole('button', { name: 'Create File' })).toBeDisabled();
  });

  it('describes each file type on its tile', () => {
    renderModal();

    expect(fileType('Kamelet')).toHaveAccessibleName(
      'Kamelet Reusable Camel route template with a well-defined interface',
    );
  });

  it.each([
    ['Camel Route YAML', 'orders.camel.yaml'],
    ['Camel Route XML', 'orders.camel.xml'],
    ['Kamelet', 'orders.kamelet.yaml'],
    ['Citrus Test', 'orders.citrus.yaml'],
  ])('shows the path of a %s', async (type, path) => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType(type));
    await user.type(screen.getByLabelText('File name'), 'orders');

    expect(screen.getByText(`Creates ${path}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create File' })).toBeEnabled();
  });

  it('puts the file into the optional folder', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Kamelet'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.type(screen.getByLabelText('Folder path (optional)'), '/kamelets/');

    expect(screen.getByText('Creates kamelets/orders.kamelet.yaml')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create File' })).toBeEnabled();
  });

  it('tells what is wrong with the name or the folder', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'routes/orders');
    expect(screen.getByText('Enter the folder in the folder field')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('File name'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.type(screen.getByLabelText('Folder path (optional)'), '../outside');
    expect(screen.getByText('Use a folder path such as routes/orders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create File' })).toBeDisabled();
  });

  it('does not create a file whose path is taken', async () => {
    await storeTestFiles();
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('Folder path (optional)'), 'integrations');
    await user.type(screen.getByLabelText('File name'), 'main-flow');

    expect(await screen.findByText('A file with this path already exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create File' })).toBeDisabled();
  });

  it('creates the file from the starter template, closes and opens it', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.type(screen.getByLabelText('Folder path (optional)'), 'routes');
    await user.click(screen.getByRole('button', { name: 'Create File' }));

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

  it('creates a Camel route in XML', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route XML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create File' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    const [file] = await storedFiles();
    expect(file.path).toBe('orders.camel.xml');
    expect(file.content).toMatch(/^<routes>\n {2}<route id="route-\d{4}"\/>\n<\/routes>\n$/);
  });

  it('names a new Kamelet after its file', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Kamelet'));
    await user.type(screen.getByLabelText('File name'), 'my-source');
    await user.click(screen.getByRole('button', { name: 'Create File' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    const [file] = await storedFiles();
    expect(file.path).toBe('my-source.kamelet.yaml');
    expect(file.content).toBe('kind: Kamelet\nmetadata:\n  name: my-source\n');
  });

  it('names a new Kamelet in a folder after its file only', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Kamelet'));
    await user.type(screen.getByLabelText('File name'), 'my-source');
    await user.type(screen.getByLabelText('Folder path (optional)'), 'kamelets');
    await user.click(screen.getByRole('button', { name: 'Create File' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    const [file] = await storedFiles();
    expect(file.path).toBe('kamelets/my-source.kamelet.yaml');
    expect(file.content).toBe('kind: Kamelet\nmetadata:\n  name: my-source\n');
  });

  it('creates a Citrus test on Enter', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Citrus Test'));
    await user.type(screen.getByLabelText('File name'), 'orders{Enter}');

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    expect((await storedFiles()).map((file) => file.path)).toEqual(['orders.citrus.yaml']);
  });

  it('does not create a file on Enter while the name is not valid', async () => {
    const fetchSpy = vi.mocked(fetch);
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('Folder path (optional)'), 'routes{Enter}');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(await storedFiles()).toEqual([]);
  });

  it('shows an error and stays open when the template cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
    );
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create File' }));

    expect(await screen.findByText('Could not create the file')).toBeInTheDocument();
    expect(screen.getByText('Could not load /camel-catalog/index.json (500)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create File' })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
    expect(await storedFiles()).toEqual([]);
  });

  it('closes on Cancel without creating a file', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
    expect(await storedFiles()).toEqual([]);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('creates no file when it is cancelled while the template is loading', async () => {
    const realFetch = vi.mocked(fetch).getMockImplementation()!;
    let releaseTemplate = () => {};
    vi.mocked(fetch).mockImplementation((url) => {
      if (!/\/starter-templates\/.+-hash\.yaml$/.test((url as URL).pathname)) return realFetch(url);
      return new Promise((resolve) => {
        releaseTemplate = () => {
          void realFetch(url).then(resolve);
        };
      });
    });
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create File' }));
    await screen.findByRole('button', { name: 'Creating…' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    releaseTemplate();

    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls).toHaveLength(3);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(await storedFiles()).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace');
  });

  it('does not create a file on Enter that confirms an IME composition', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    fireEvent.keyDown(screen.getByLabelText('File name'), { key: 'Enter', isComposing: true });

    expect(fetch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
