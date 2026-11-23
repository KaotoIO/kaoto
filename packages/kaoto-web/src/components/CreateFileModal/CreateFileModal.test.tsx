import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';

import { fileUrl } from '../../routes/file-url';
import { storedFiles, storeTestFiles, withFiles } from '../../test/files';
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

/** Renders the modal in StrictMode, as the app does, so that effects run, clean up and run again */
const renderModal = () =>
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/workspace']}>
        {withFiles(
          <>
            <Routes>
              <Route path="*" element={<LocationDisplay />} />
            </Routes>
            <CreateFileModal onClose={onClose} />
          </>,
        )}
      </MemoryRouter>
    </StrictMode>,
  );

/** The tile of the type; "Citrus Test" must not match "Citrus Test XML" */
const fileType = (name: string) => screen.getByRole('radio', { name: new RegExp(`^${name}(?! XML)`) });

describe('CreateFileModal', () => {
  beforeEach(() => {
    resetTestIndexedDB();
    serveCatalog();
    onClose.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers the file types with a Camel route in YAML chosen, and the name ready to type', async () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Create new file' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'File type' })).toBeInTheDocument();
    expect(fileType('Camel Route YAML')).toBeChecked();
    for (const type of ['Camel Route XML', 'Kamelet', 'Citrus Test', 'Citrus Test XML']) {
      expect(fileType(type)).not.toBeChecked();
    }
    expect(screen.queryByRole('radio', { name: /^Pipe/ })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('File name')).toHaveFocus();
    });
    expect(screen.getByLabelText('File name')).toHaveAttribute('placeholder', 'e.g. orders.camel.yaml');
    expect(screen.getByLabelText('Folder path (optional)')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('describes each file type on its tile', () => {
    renderModal();

    // Without the stylesheet (css: false) label and description are inline spans, so jsdom joins them without a
    // space; in the browser they are flex items and get one.
    expect(fileType('Kamelet')).toHaveAccessibleName(
      /^Kamelet\s*Reusable Camel route template with a well-defined interface$/,
    );
  });

  it.each([
    ['Camel Route YAML', 'orders.camel.yaml'],
    ['Camel Route XML', 'orders.camel.xml'],
    ['Kamelet', 'orders.kamelet.yaml'],
    ['Citrus Test', 'orders.citrus.yaml'],
    ['Citrus Test XML', 'orders.citrus.xml'],
  ])('shows the path of a %s', async (type, path) => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType(type));
    await user.type(screen.getByLabelText('File name'), 'orders');

    expect(screen.getByTestId('create-file-preview')).toHaveTextContent(path);
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
  });

  it('puts the file into the optional folder', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Kamelet'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.type(screen.getByLabelText('Folder path (optional)'), '/kamelets/');

    expect(screen.getByTestId('create-file-preview')).toHaveTextContent('kamelets/orders.kamelet.yaml');
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled();
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
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('does not create a file whose path is taken', async () => {
    await storeTestFiles();
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('Folder path (optional)'), 'integrations');
    await user.type(screen.getByLabelText('File name'), 'main-flow');

    expect(await screen.findByText('A file with this path already exists')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('creates the file from the starter template, closes and opens it', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
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
      expect(screen.getByTestId('location')).toHaveTextContent(fileUrl(file.path));
    });
  });

  it('creates a Camel route in XML', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route XML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create' }));

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
    await user.click(screen.getByRole('button', { name: 'Create' }));

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
    await user.click(screen.getByRole('button', { name: 'Create' }));

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

  it('creates a Citrus test in XML from the bundled template, without loading it from the catalog', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Citrus Test XML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
    const [file] = await storedFiles();
    expect(file.path).toBe('orders.citrus.xml');
    expect(file.content).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<test [^>]*name="test-\d{4}">/);
    expect(file.content).not.toContain('__KAOTO_ID__');
    expect(fetch).not.toHaveBeenCalled();
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
    let finishTemplate: () => Promise<unknown> = () => Promise.resolve();
    vi.mocked(fetch).mockImplementation((url) => {
      if (!/\/starter-templates\/.+-hash\.yaml$/.test((url as URL).pathname)) return realFetch(url);
      return new Promise((resolve) => {
        finishTemplate = () => realFetch(url).then(resolve);
      });
    });
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByRole('button', { name: 'Creating…' });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await act(async () => {
      await finishTemplate();
    });

    expect(await storedFiles()).toEqual([]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace');
  });

  it('locks the form while the file is created, but not Cancel', async () => {
    const realFetch = vi.mocked(fetch).getMockImplementation()!;
    let finishTemplate: () => Promise<unknown> = () => Promise.resolve();
    vi.mocked(fetch).mockImplementation((url) => {
      if (!/\/starter-templates\/.+-hash\.yaml$/.test((url as URL).pathname)) return realFetch(url);
      return new Promise((resolve) => {
        finishTemplate = () => realFetch(url).then(resolve);
      });
    });
    const user = userEvent.setup();
    renderModal();

    await user.click(fileType('Camel Route YAML'));
    await user.type(screen.getByLabelText('File name'), 'orders');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await screen.findByRole('button', { name: 'Creating…' });

    for (const type of ['Camel Route YAML', 'Camel Route XML', 'Kamelet', 'Citrus Test']) {
      expect(fileType(type)).toBeDisabled();
    }
    expect(screen.getByLabelText('File name')).toBeDisabled();
    expect(screen.getByLabelText('Folder path (optional)')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();

    await act(async () => {
      await finishTemplate();
    });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
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
