import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, TEST_FILES, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { buildTree, toFolderId } from './build-tree';
import { Explorer } from './Explorer';
import { filterFiles } from './filterFiles';

const TREE = buildTree(TEST_FILES);

const renderComponent = () =>
  render(
    <MemoryRouter initialEntries={['/workspace']}>
      <Routes>
        <Route path="/workspace" element={withFiles(<Explorer />)} />
      </Routes>
    </MemoryRouter>,
  );

/**
 * Renders Explorer inside a nested route that mirrors the real app structure:
 * the inner Route provides :fileId when navigated to the file path,
 * so that useParams() inside Explorer returns fileId for selection sync.
 */
const renderWithNavigation = (children?: React.ReactNode, initialPath = '/workspace') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/workspace"
          element={withFiles(
            <>
              <Explorer />
              {children}
              <Outlet />
            </>,
          )}
        >
          <Route index element={null} />
          <Route path="file/:fileId" element={null} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('filterFiles', () => {
  it('returns the original array when query is empty', () => {
    expect(filterFiles(TREE, '')).toBe(TREE);
  });

  it('returns only nodes whose name contains the query', () => {
    const result = filterFiles(TREE, 'main');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(toFolderId('integrations'));
    expect(result[0].children?.map((c) => c.id)).toEqual(['main-flow']);
  });

  it('excludes non-matching siblings when a child matches', () => {
    const result = filterFiles(TREE, 'rest-api');
    const routes = result[0].children?.find((c) => c.id === toFolderId('integrations/routes'));
    expect(routes?.children?.map((c) => c.id)).toEqual(['rest-api']);
  });

  it('returns a folder with all its children when the folder name matches', () => {
    const result = filterFiles(TREE, 'resources');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(toFolderId('resources'));
    // All original children are kept so the user can browse folder contents
    expect(result[0].children).toHaveLength(3); // schema, mapping, templates
  });

  it('recurses into 3-level deep folders', () => {
    const result = filterFiles(TREE, 'kafka');
    const async_ = result[0].children
      ?.find((c) => c.id === toFolderId('integrations/routes'))
      ?.children?.find((c) => c.id === toFolderId('integrations/routes/async'));
    expect(async_?.children?.map((c) => c.id)).toEqual(['kafka-consumer', 'kafka-producer']);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterFiles(TREE, 'nonexistent-xyz')).toHaveLength(0);
  });

  it('does not mutate the original nodes', () => {
    const original = TREE[1]; // resources
    filterFiles(TREE, 'resources');
    expect(original.children).toHaveLength(3); // schema, mapping, templates
  });
});

describe('Explorer', () => {
  beforeEach(async () => {
    resetTestIndexedDB();
    await storeTestFiles();
  });

  it('shows a loading placeholder until the files are loaded', async () => {
    renderComponent();

    expect(screen.getByTestId('explorer-loading')).toBeInTheDocument();
    expect(await screen.findByTestId('explorer-folder-integrations')).toBeInTheDocument();
    expect(screen.queryByTestId('explorer-loading')).not.toBeInTheDocument();
  });

  it('shows an empty state when there are no files', async () => {
    resetTestIndexedDB();

    renderComponent();

    expect(await screen.findByTestId('explorer-empty')).toHaveTextContent('No files yet');
    expect(screen.getByRole('button', { name: 'Create…' })).toBeInTheDocument();
    expect(screen.queryByRole('tree')).not.toBeInTheDocument();
  });

  it('shows an error when the files cannot be loaded', async () => {
    // Drops the connection that storing the test files opened
    resetTestIndexedDB();
    // @ts-expect-error simulating a browser without IndexedDB
    globalThis.indexedDB = undefined;

    renderComponent();

    expect(await screen.findByText('Could not load the files')).toBeInTheDocument();
    expect(screen.getByText(/browser storage may be blocked/)).toBeInTheDocument();
    expect(screen.queryByTestId('explorer-loading')).not.toBeInTheDocument();
  });

  it('loads the files again on retry', async () => {
    // Drops the connection that storing the test files opened
    resetTestIndexedDB();
    // @ts-expect-error simulating a browser without IndexedDB
    globalThis.indexedDB = undefined;
    const user = userEvent.setup();
    renderComponent();
    await screen.findByText('Could not load the files');

    resetTestIndexedDB();
    await storeTestFiles();
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByTestId('explorer-folder-integrations')).toBeInTheDocument();
  });

  it('shows the nested folders of the stored paths', async () => {
    const user = userEvent.setup();
    renderComponent();

    for (const folderId of ['integrations', 'integrations/routes', 'integrations/routes/async']) {
      const folderNode = await screen.findByTestId(`explorer-folder-${folderId}`);
      await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
    }

    expect(screen.getByTestId('explorer-file-kafka-consumer')).toHaveTextContent('kafka-consumer.camel.yaml');
  });

  it.each(['order-test', 'timer-source', 'orders-pipe', 'legacy-route'])(
    'opens %s (non-camel.yaml canvas resource) on click',
    async (id) => {
      const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);

      const folderNode = await screen.findByTestId('explorer-folder-integrations');
      await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
      await user.click(screen.getByTestId(`explorer-file-${id}`));

      expect(screen.getByTestId('location')).toHaveTextContent(`/workspace/file/${id}`);
    },
  );

  it('renders the sidebar structure', async () => {
    renderComponent();
    expect(screen.getByTestId('explorer')).toBeInTheDocument();
    expect(screen.getByTestId('route-selector-area')).toBeInTheDocument();
    expect(await screen.findByTestId('explorer-folder-integrations')).toBeInTheDocument();
    expect(screen.getByTestId('explorer-folder-resources')).toBeInTheDocument();
  });

  it.each([
    ['the toolbar', 'Create a file'],
    ['the empty state', 'Create…'],
  ])('opens the Create New File modal from %s and closes it on Cancel', async (_label, buttonName) => {
    resetTestIndexedDB();
    const user = userEvent.setup();
    renderComponent();
    await screen.findByTestId('explorer-empty');

    await user.click(screen.getByRole('button', { name: buttonName }));
    expect(screen.getByRole('heading', { name: 'Create New File' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByTestId('create-file-modal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: buttonName })).toHaveFocus();
  });

  it('returns the focus to the toolbar button when the Create New File modal is closed with Escape', async () => {
    resetTestIndexedDB();
    const user = userEvent.setup();
    renderComponent();
    await screen.findByTestId('explorer-empty');

    screen.getByRole('button', { name: 'Create a file' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Create New File' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('create-file-modal')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a file' })).toHaveFocus();
  });

  it('focuses the toolbar button after a file is created from the empty state', async () => {
    resetTestIndexedDB();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: URL) => {
        const { pathname } = url;
        if (pathname === '/camel-catalog/index.json') {
          return Promise.resolve(new Response(JSON.stringify({ starterTemplates: 'starter-templates/index-1.json' })));
        }
        if (pathname === '/camel-catalog/starter-templates/index-1.json') {
          return Promise.resolve(
            new Response(JSON.stringify({ catalogs: { 'camel-route-yaml': { file: 'camel-route-yaml-hash.yaml' } } })),
          );
        }
        return Promise.resolve(new Response('- route:\n    id: route-1\n'));
      }),
    );
    try {
      const user = userEvent.setup();
      renderWithNavigation();
      await screen.findByTestId('explorer-empty');

      await user.click(screen.getByRole('button', { name: 'Create…' }));
      await user.click(screen.getByRole('radio', { name: /^Camel Route YAML/ }));
      await user.type(screen.getByLabelText('File name'), 'orders');
      await user.click(screen.getByRole('button', { name: 'Create File' }));

      expect(await screen.findByText('orders.camel.yaml')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Create…' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create a file' })).toHaveFocus();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('renders toolbar with Add button and Search, without Delete', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Create a file' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search files' })).toBeInTheDocument();
  });

  it('filters the tree and auto-expands matching folders on search', async () => {
    const user = userEvent.setup();
    renderComponent();
    await screen.findByTestId('explorer-folder-integrations');

    await user.type(screen.getByRole('searchbox'), 'main');

    expect(screen.getByTestId('explorer-file-main-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('explorer-file-error-handler')).not.toBeInTheDocument();
    expect(screen.getByTestId('explorer-folder-integrations')).toHaveAttribute('aria-expanded', 'true');
  });

  it('navigates to the integration route on file click and keeps the folder expanded', async () => {
    const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
    const user = userEvent.setup();
    renderWithNavigation(<LocationDisplay />);

    const folderNode = await screen.findByTestId('explorer-folder-integrations');
    await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
    expect(folderNode).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByText('main-flow.camel.yaml'));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/file/main-flow');
    expect(screen.getByTestId('explorer-folder-integrations')).toHaveAttribute('aria-expanded', 'true');
  });

  it('highlights the active integration derived from the URL', async () => {
    const user = userEvent.setup();
    renderWithNavigation();

    const folderNode = await screen.findByTestId('explorer-folder-integrations');
    await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);

    await user.click(screen.getByText('main-flow.camel.yaml'));
    expect(screen.getByTestId('explorer-file-main-flow')).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByText('error-handler.camel.yaml'));
    expect(screen.getByTestId('explorer-file-error-handler')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('explorer-file-main-flow')).toHaveAttribute('aria-selected', 'false');
  });

  it('syncs selection with the URL on browser back/forward navigation', async () => {
    // NavCapture is rendered inside the shared router so navigate(-1) works in context.
    let navigateFn: ReturnType<typeof useNavigate> = () => {};
    const NavCapture = () => {
      navigateFn = useNavigate();
      return null;
    };
    const user = userEvent.setup();
    renderWithNavigation(<NavCapture />);

    // Expand the Integrations folder and click main-flow
    const folderNode = await screen.findByTestId('explorer-folder-integrations');
    await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
    await user.click(screen.getByText('main-flow.camel.yaml'));
    expect(screen.getByTestId('explorer-file-main-flow')).toHaveAttribute('aria-selected', 'true');

    // Navigate to error-handler — main-flow should deselect
    await user.click(screen.getByText('error-handler.camel.yaml'));
    expect(screen.getByTestId('explorer-file-error-handler')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('explorer-file-main-flow')).toHaveAttribute('aria-selected', 'false');

    // Go back — URL returns to main-flow; Explorer must follow
    act(() => {
      void navigateFn(-1);
    });
    expect(screen.getByTestId('explorer-file-main-flow')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('explorer-file-error-handler')).toHaveAttribute('aria-selected', 'false');
  });

  describe('opening files', () => {
    const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;

    it('does not navigate when a non-integration file is clicked', async () => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);

      const folderNode = await screen.findByTestId('explorer-folder-resources');
      await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
      await user.click(screen.getByTestId('explorer-file-schema'));

      expect(screen.getByTestId('location')).toHaveTextContent('/workspace');
      expect(screen.getByTestId('location')).not.toHaveTextContent('/file/');
    });
  });

  describe('resizing', () => {
    const drag = (fromX: number, toX: number) => {
      fireEvent.mouseDown(screen.getByRole('button', { name: 'Resize explorer panel' }), { clientX: fromX });
      fireEvent.mouseMove(document, { clientX: toX });
    };

    it('grows the panel following the mouse', () => {
      renderComponent();

      drag(100, 160);

      expect(screen.getByTestId('explorer')).toHaveStyle({ inlineSize: '300px' });
    });

    it('clamps the panel to the minimum and maximum widths', () => {
      renderComponent();

      drag(100, -1000);
      expect(screen.getByTestId('explorer')).toHaveStyle({ inlineSize: '160px' });

      fireEvent.mouseUp(document);
      drag(100, 1000);
      expect(screen.getByTestId('explorer')).toHaveStyle({ inlineSize: '480px' });
    });

    it('stops resizing after the mouse is released', () => {
      renderComponent();

      drag(100, 160);
      fireEvent.mouseUp(document);
      fireEvent.mouseMove(document, { clientX: 300 });

      expect(screen.getByTestId('explorer')).toHaveStyle({ inlineSize: '300px' });
    });
  });

  describe('deleting', () => {
    const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
    const storedPaths = async () => (await filesStore.getFiles()).map((file) => file.path);

    const expandFolder = async (user: ReturnType<typeof userEvent.setup>, folderPath: string) => {
      const folderNode = await screen.findByTestId(`explorer-folder-${folderPath}`);
      await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
    };

    it('keeps the row buttons out of the names of the tree items and the tab order', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');

      const file = screen.getByRole('treeitem', { name: 'main-flow.camel.yaml' });
      expect(file).toHaveAttribute('aria-keyshortcuts', 'F2 Delete Backspace');
      expect(screen.getByRole('treeitem', { name: /^integrations/ })).toHaveAttribute(
        'aria-keyshortcuts',
        'Delete Backspace',
      );
      const deleteButton = screen.getByTestId('explorer-delete-main-flow');
      const renameButton = screen.getByTestId('explorer-rename-main-flow');
      expect(deleteButton.parentElement).toHaveAttribute('aria-hidden', 'true');
      expect(renameButton.parentElement).toBe(deleteButton.parentElement);
      expect(deleteButton).toHaveAttribute('tabindex', '-1');
      expect(renameButton).toHaveAttribute('tabindex', '-1');
      expect(deleteButton).toHaveAttribute('title', 'Delete file');
      expect(renameButton).toHaveAttribute('title', 'Rename file');
      expect(screen.getByTestId(`explorer-delete-${toFolderId('integrations')}`)).toHaveAttribute(
        'title',
        'Delete folder',
      );
      // Folders cannot be renamed yet
      expect(screen.queryByTestId(`explorer-rename-${toFolderId('integrations')}`)).not.toBeInTheDocument();
    });

    it('deletes a file after confirmation without opening it', async () => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId('explorer-delete-main-flow'));

      expect(screen.getByTestId('location')).toHaveTextContent(/^\/workspace$/);
      expect(screen.getByRole('heading', { name: 'Delete file?' })).toBeInTheDocument();
      expect(screen.getByTestId('delete-confirm-modal')).toHaveTextContent(
        'Are you sure you want to delete main-flow.camel.yaml? This action cannot be undone.',
      );

      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByTestId('explorer-file-main-flow')).not.toBeInTheDocument();
      });
      expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
      expect(await storedPaths()).not.toContain('integrations/main-flow.camel.yaml');
      expect(await storedPaths()).toHaveLength(TEST_FILES.length - 1);
    });

    it('deletes a folder with its subfolders after confirmation without collapsing it', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');
      const routes = await screen.findByTestId('explorer-folder-integrations/routes');
      await user.click(routes.querySelector('.cds--tree-parent-node__toggle')!);

      await user.click(screen.getByTestId(`explorer-delete-${toFolderId('integrations/routes')}`));

      expect(routes).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('heading', { name: 'Delete folder?' })).toBeInTheDocument();
      expect(screen.getByTestId('delete-confirm-modal')).toHaveTextContent(
        'Are you sure you want to delete the folder routes and all its contents? This action cannot be undone.',
      );

      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByTestId('explorer-folder-integrations/routes')).not.toBeInTheDocument();
      });
      const paths = await storedPaths();
      expect(paths.filter((path) => path.startsWith('integrations/routes/'))).toEqual([]);
      expect(paths).toHaveLength(TEST_FILES.length - 3);
      expect(screen.getByTestId('explorer-file-main-flow')).toBeInTheDocument();
    });

    it('deletes every subfolder and file of a folder and nothing outside it', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');
      await expandFolder(user, 'integrations/routes');
      await expandFolder(user, 'integrations/routes/async');
      const inIntegrations = TEST_FILES.filter((file) => file.path.startsWith('integrations/'));
      const outside = TEST_FILES.filter((file) => !file.path.startsWith('integrations/'));
      // The folder holds files on three levels
      expect(inIntegrations.map((file) => file.path.split('/').length)).toEqual(expect.arrayContaining([2, 3, 4]));

      await user.click(screen.getByTestId(`explorer-delete-${toFolderId('integrations')}`));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByTestId('explorer-folder-integrations')).not.toBeInTheDocument();
      });
      for (const folder of ['integrations/routes', 'integrations/routes/async']) {
        expect(screen.queryByTestId(`explorer-folder-${folder}`)).not.toBeInTheDocument();
      }
      for (const file of inIntegrations) {
        expect(screen.queryByTestId(`explorer-file-${file.id}`)).not.toBeInTheDocument();
      }
      expect(await storedPaths()).toEqual(outside.map((file) => file.path).sort());
      expect(screen.getByTestId('explorer-folder-resources')).toBeInTheDocument();
    });

    it('keeps the file on Cancel and focuses its tree item again', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId('explorer-delete-main-flow'));
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('explorer-file-main-flow')).toHaveFocus();
      expect(await storedPaths()).toHaveLength(TEST_FILES.length);
    });

    it('asks to delete the focused file on Delete, not the folders around it', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');
      screen.getByTestId('explorer-file-main-flow').focus();

      await user.keyboard('{Delete}');

      expect(screen.getByRole('heading', { name: 'Delete file?' })).toBeInTheDocument();
      expect(screen.getByTestId('delete-confirm-modal')).toHaveTextContent('main-flow.camel.yaml');
    });

    it('asks to delete the focused folder on Delete', async () => {
      const user = userEvent.setup();
      renderComponent();
      (await screen.findByTestId('explorer-folder-resources')).focus();

      await user.keyboard('{Delete}');

      expect(screen.getByRole('heading', { name: 'Delete folder?' })).toBeInTheDocument();
    });

    // The key labelled "delete" on a Mac keyboard sends Backspace
    it('asks to delete the focused file on Backspace', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');
      screen.getByTestId('explorer-file-main-flow').focus();

      await user.keyboard('{Backspace}');

      expect(screen.getByRole('heading', { name: 'Delete file?' })).toBeInTheDocument();
      expect(screen.getByTestId('delete-confirm-modal')).toHaveTextContent('main-flow.camel.yaml');
    });

    it('ignores other keys', async () => {
      const user = userEvent.setup();
      renderComponent();
      (await screen.findByTestId('explorer-folder-resources')).focus();

      await user.keyboard('x');

      expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
    });

    it('focuses the first tree item once the focused item is deleted', async () => {
      const user = userEvent.setup();
      renderComponent();
      (await screen.findByTestId('explorer-folder-resources')).focus();

      await user.keyboard('{Delete}');
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.getByTestId('explorer-folder-integrations')).toHaveFocus();
      });
    });

    it('focuses the add button once the last file is deleted', async () => {
      resetTestIndexedDB();
      await storeTestFiles([TEST_FILES[0]]);
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId('explorer-delete-main-flow'));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.getByTestId('explorer-add')).toHaveFocus();
      });
      expect(screen.getByTestId('explorer-empty')).toBeInTheDocument();
    });

    it.each([
      ['the open file', 'explorer-delete-main-flow', '/workspace'],
      ['the folder of the open file', `explorer-delete-${toFolderId('integrations')}`, '/workspace'],
      ['another file', 'explorer-delete-error-handler', '/workspace/file/main-flow'],
      ['another folder', `explorer-delete-${toFolderId('resources')}`, '/workspace/file/main-flow'],
    ])('leads to %s and stays at %s', async (_, deleteButton, location) => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />, '/workspace/file/main-flow');
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId(deleteButton));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
      });
      // The navigation can finish after the modal closes
      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe(location);
      });
    });

    it('shows the error in the modal and keeps the file when deleting fails', async () => {
      vi.spyOn(filesStore, 'deleteFile').mockRejectedValueOnce(new Error('The storage is blocked'));
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId('explorer-delete-main-flow'));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      expect(await screen.findByText('The storage is blocked')).toBeInTheDocument();
      expect(screen.getByTestId('explorer-file-main-flow')).toBeInTheDocument();
      expect(await storedPaths()).toHaveLength(TEST_FILES.length);
    });
  });

  describe('renaming', () => {
    const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
    const storedFile = async (id: string) => (await filesStore.getFiles()).find((file) => file.id === id);

    const expandIntegrations = async (user: ReturnType<typeof userEvent.setup>) => {
      const folderNode = await screen.findByTestId('explorer-folder-integrations');
      await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
    };

    const startRenaming = async (user: ReturnType<typeof userEvent.setup>, id = 'main-flow') => {
      await user.click(screen.getByTestId(`explorer-rename-${id}`));
      return screen.getByRole('textbox', { name: 'Rename file' });
    };

    it('replaces the name with a focused field that selects the name before the extension', async () => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);
      await expandIntegrations(user);

      const input = await startRenaming(user);

      expect(input).toHaveValue('main-flow.camel.yaml');
      expect(input).toHaveFocus();
      expect((input as HTMLInputElement).selectionStart).toBe(0);
      expect((input as HTMLInputElement).selectionEnd).toBe('main-flow'.length);
      expect(screen.getByTestId('location').textContent).toBe('/workspace');
      expect(screen.queryByTestId('explorer-delete-main-flow')).not.toBeInTheDocument();
    });

    it('starts renaming the focused file on F2, but not a folder', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      screen.getByTestId('explorer-folder-integrations').focus();
      await user.keyboard('{F2}');
      expect(screen.queryByRole('textbox', { name: 'Rename file' })).not.toBeInTheDocument();

      screen.getByTestId('explorer-file-main-flow').focus();
      await user.keyboard('{F2}');
      expect(screen.getByRole('textbox', { name: 'Rename file' })).toHaveValue('main-flow.camel.yaml');
    });

    it('renames the file in its folder on Enter and focuses its tree item again', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      const input = await startRenaming(user);
      await user.keyboard('orders flow{Enter}');

      await waitFor(() => {
        expect(screen.queryByRole('textbox', { name: 'Rename file' })).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('explorer-file-main-flow')).toHaveTextContent('orders flow.camel.yaml');
      expect(screen.getByTestId('explorer-file-main-flow')).toHaveFocus();
      expect(await storedFile('main-flow')).toMatchObject({
        path: 'integrations/orders flow.camel.yaml',
        content: TEST_FILES[0].content,
      });
      expect(input).not.toBeInTheDocument();
    });

    it('keeps the renamed file open', async () => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />, '/workspace/file/main-flow');
      await expandIntegrations(user);

      await startRenaming(user);
      await user.keyboard('orders{Enter}');

      await waitFor(async () => {
        expect((await storedFile('main-flow'))?.path).toBe('integrations/orders.camel.yaml');
      });
      expect(screen.getByTestId('location').textContent).toBe('/workspace/file/main-flow');
      expect(screen.getByTestId('explorer-file-main-flow')).toHaveAttribute('aria-selected', 'true');
    });

    it('cancels on Escape and focuses the tree item again', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      await startRenaming(user);
      await user.keyboard('orders{Escape}');

      expect(screen.queryByRole('textbox', { name: 'Rename file' })).not.toBeInTheDocument();
      expect(screen.getByTestId('explorer-file-main-flow')).toHaveTextContent('main-flow.camel.yaml');
      expect(screen.getByTestId('explorer-file-main-flow')).toHaveFocus();
      expect((await storedFile('main-flow'))?.path).toBe(TEST_FILES[0].path);
    });

    it('renames when the field loses the focus and leaves the focus where it went', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      await startRenaming(user);
      await user.keyboard('orders');
      await user.click(screen.getByRole('searchbox'));

      await waitFor(async () => {
        expect((await storedFile('main-flow'))?.path).toBe('integrations/orders.camel.yaml');
      });
      expect(screen.queryByRole('textbox', { name: 'Rename file' })).not.toBeInTheDocument();
      expect(screen.getByRole('searchbox')).toHaveFocus();
    });

    it.each([
      ['a taken name', 'error-handler', 'A file with that name already exists'],
      ['an empty name', '{Backspace}', 'Enter a file name'],
      ['a name with a slash', 'routes/orders', 'A file name cannot contain / or \\'],
    ])('shows an error for %s and keeps the field open on Enter', async (_, typed, error) => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      const input = await startRenaming(user);
      if (typed === '{Backspace}') await user.clear(input);
      else await user.keyboard(typed);
      await user.keyboard('{Enter}');

      expect(screen.getByText(error)).toBeInTheDocument();
      expect(input).toHaveAttribute('data-invalid', 'true');
      expect(input).toHaveFocus();
      expect((await storedFile('main-flow'))?.path).toBe(TEST_FILES[0].path);
    });

    it('cancels when the field loses the focus with a name that cannot be used', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      await startRenaming(user);
      await user.keyboard('error-handler');
      await user.click(screen.getByRole('searchbox'));

      expect(screen.queryByRole('textbox', { name: 'Rename file' })).not.toBeInTheDocument();
      expect(screen.getByTestId('explorer-file-main-flow')).toHaveTextContent('main-flow.camel.yaml');
      expect((await storedFile('main-flow'))?.path).toBe(TEST_FILES[0].path);
    });

    it('closes without writing when the name is unchanged', async () => {
      const rename = vi.spyOn(filesStore, 'renameFile');
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      await startRenaming(user);
      await user.keyboard('{Enter}');

      expect(screen.queryByRole('textbox', { name: 'Rename file' })).not.toBeInTheDocument();
      expect(rename).not.toHaveBeenCalled();
    });

    it('shows the error and keeps the field open when the store fails', async () => {
      vi.spyOn(filesStore, 'renameFile').mockRejectedValueOnce(new Error('The storage is blocked'));
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      const input = await startRenaming(user);
      await user.keyboard('orders{Enter}');

      expect(await screen.findByText('The storage is blocked')).toBeInTheDocument();
      expect(input).toBeInTheDocument();

      await user.keyboard('-flow');
      expect(screen.queryByText('The storage is blocked')).not.toBeInTheDocument();
    });

    it('keeps the field of another file open when the previous rename finishes after it opened', async () => {
      let finishStoring!: () => void;
      const storing = new Promise<void>((resolve) => {
        finishStoring = resolve;
      });
      const renameFile = filesStore.renameFile.bind(filesStore);
      vi.spyOn(filesStore, 'renameFile').mockImplementationOnce(async (...args) => {
        await storing;
        return renameFile(...args);
      });
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      await startRenaming(user);
      await user.keyboard('orders');
      // Clicking the rename button of another file moves the focus away first, which renames the first file
      const other = await startRenaming(user, 'error-handler');
      expect(other).toHaveValue('error-handler.camel.yaml');

      await act(async () => {
        finishStoring();
        await storing;
      });

      await waitFor(async () => {
        expect((await storedFile('main-flow'))?.path).toBe('integrations/orders.camel.yaml');
      });
      expect(screen.getByRole('textbox', { name: 'Rename file' })).toBe(other);
      expect(other).toHaveFocus();
    });

    it('does not rename on Enter or cancel on Escape while an IME composition is active', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      const input = await startRenaming(user);
      await user.keyboard('ちゅうもん');
      fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
      fireEvent.keyDown(input, { key: 'Escape', isComposing: true });

      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
      expect((await storedFile('main-flow'))?.path).toBe(TEST_FILES[0].path);

      await user.keyboard('{Enter}');
      await waitFor(async () => {
        expect((await storedFile('main-flow'))?.path).toBe('integrations/ちゅうもん.camel.yaml');
      });
    });

    it('keeps the keys and clicks in the field away from the tree', async () => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);
      await expandIntegrations(user);

      const input = await startRenaming(user);
      await user.click(input);
      await user.keyboard('{Home}{ArrowRight}{ArrowLeft} x {Delete}');

      expect(input).toHaveValue(' x ain-flow.camel.yaml');
      expect(input).toHaveFocus();
      expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('location').textContent).toBe('/workspace');
      expect(screen.getByTestId('explorer-folder-integrations')).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
