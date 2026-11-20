import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    // There is no routes section above the Explorer: a file can hold dozens of routes
    expect(screen.queryByTestId('route-selector-area')).not.toBeInTheDocument();
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

  it('shows the Explorer heading in the toolbar row with the three buttons', () => {
    renderComponent();

    const heading = screen.getByRole('heading', { name: 'Explorer', level: 2 });
    const toolbar = heading.closest<HTMLElement>('.cs--explorer__toolbar')!;
    expect(toolbar).toBeInTheDocument();
    for (const name of ['Create a file', 'New file', 'New folder']) {
      expect(within(toolbar).getByRole('button', { name })).toBeInTheDocument();
    }
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
        'F2 Delete Backspace',
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
      expect(screen.getByTestId(`explorer-rename-${toFolderId('integrations')}`)).toHaveAttribute(
        'title',
        'Rename folder',
      );
    });

    it('deletes a file after confirmation without opening it', async () => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId('explorer-delete-main-flow'));

      expect(screen.getByTestId('location')).toHaveTextContent(/^\/workspace$/);
      expect(screen.getByRole('heading', { name: 'Delete file?' })).toBeInTheDocument();
      expect(screen.getByTestId('delete-confirm-modal')).toHaveTextContent(
        'Are you sure you want to delete integrations/main-flow.camel.yaml?',
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
        'Are you sure you want to delete the folder integrations/routes and all its contents?',
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
      // The stored folders too, or the empty ones would come back on a reload
      const storedFolders = await filesStore.getFolders();
      expect(storedFolders.filter((path) => path === 'integrations' || path.startsWith('integrations/'))).toEqual([]);
      expect(storedFolders).toContain('resources');
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

    it('keeps the folder and focuses it once its last file is deleted', async () => {
      resetTestIndexedDB();
      await storeTestFiles([TEST_FILES[0]]);
      const user = userEvent.setup();
      renderComponent();
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId('explorer-delete-main-flow'));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.getByTestId('explorer-folder-integrations')).toHaveFocus();
      });
      expect(screen.queryByTestId('explorer-empty')).not.toBeInTheDocument();
    });

    it('shows the empty state and focuses the add button once the last folder is deleted', async () => {
      resetTestIndexedDB();
      await storeTestFiles([TEST_FILES[0]]);
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByTestId(`explorer-delete-${toFolderId('integrations')}`));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      await waitFor(() => {
        expect(screen.getByTestId('explorer-add')).toHaveFocus();
      });
      expect(screen.getByTestId('explorer-empty')).toBeInTheDocument();
    });

    it.each([
      ['the open file', '/workspace', 'main-flow'],
      ['the folder of the open file', '/workspace', toFolderId('integrations')],
      ['another file', '/workspace/file/main-flow', 'error-handler'],
      ['another folder', '/workspace/file/main-flow', toFolderId('resources')],
    ])('deleting %s leads to %s', async (_, location, nodeId) => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />, '/workspace/file/main-flow');
      await expandFolder(user, 'integrations');

      await user.click(screen.getByTestId(`explorer-delete-${nodeId}`));
      await user.click(screen.getByRole('button', { name: 'Delete' }));

      // A wrong redirect has happened by the time the node is gone, so waiting for the location cannot pass too early
      await waitFor(() => {
        expect(screen.queryByTestId(`explorer-delete-${nodeId}`)).not.toBeInTheDocument();
      });
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

    it('edits the name with Backspace and Delete instead of asking to delete the file', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      const input = await startRenaming(user);
      await user.keyboard('{Backspace}{Delete}');

      expect(input).toHaveValue('camel.yaml');
      expect(input).toHaveFocus();
      expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
    });

    it('starts renaming the focused file or folder on F2', async () => {
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      screen.getByTestId('explorer-file-main-flow').focus();
      await user.keyboard('{F2}');
      expect(screen.getByRole('textbox', { name: 'Rename file' })).toHaveValue('main-flow.camel.yaml');
      await user.keyboard('{Escape}');

      screen.getByTestId('explorer-folder-resources').focus();
      await user.keyboard('{F2}');
      expect(screen.getByRole('textbox', { name: 'Rename folder' })).toHaveValue('resources');
    });

    describe('folders', () => {
      const renameFolder = async (user: ReturnType<typeof userEvent.setup>, folderPath: string, name: string) => {
        await user.click(screen.getByTestId(`explorer-rename-${toFolderId(folderPath)}`));
        const input = screen.getByRole('textbox', { name: 'Rename folder' });
        await user.clear(input);
        await user.keyboard(`${name}{Enter}`);
      };

      it('renames a folder with the button, moves what it holds and focuses it again', async () => {
        const user = userEvent.setup();
        renderComponent();
        await screen.findByTestId('explorer-folder-resources');

        await user.click(screen.getByTestId(`explorer-rename-${toFolderId('resources')}`));
        const input = screen.getByRole('textbox', { name: 'Rename folder' });
        expect(input).toHaveValue('resources');
        expect(input).toHaveFocus();
        await user.clear(input);
        await user.keyboard('assets{Enter}');

        await waitFor(async () => {
          expect((await storedFile('schema'))?.path).toBe('assets/schema.xsd');
        });
        expect((await storedFile('order-template'))?.path).toBe('assets/templates/order-template.json');
        await waitFor(() => {
          expect(screen.getByTestId('explorer-folder-assets')).toHaveFocus();
        });
        expect(screen.queryByTestId('explorer-folder-resources')).not.toBeInTheDocument();
      });

      it('keeps the open file open and a renamed folder expanded', async () => {
        const user = userEvent.setup();
        renderWithNavigation(<LocationDisplay />, '/workspace/file/rest-api');
        await expandIntegrations(user);
        const routes = screen.getByTestId('explorer-folder-integrations/routes');
        await user.click(routes.querySelector('.cds--tree-parent-node__toggle')!);

        await renameFolder(user, 'integrations/routes', 'api');

        await waitFor(() => {
          expect(screen.getByTestId('explorer-folder-integrations/api')).toHaveAttribute('aria-expanded', 'true');
        });
        expect(screen.getByTestId('location').textContent).toBe('/workspace/file/rest-api');
        expect(screen.getByTestId('explorer-file-rest-api')).toHaveAttribute('aria-selected', 'true');
      });

      it('shows an error for a name that is taken and keeps the field open on Enter', async () => {
        const user = userEvent.setup();
        renderComponent();
        await screen.findByTestId('explorer-folder-resources');

        await renameFolder(user, 'resources', 'integrations');

        expect(screen.getByText('A file or folder with that name already exists')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Rename folder' })).toHaveFocus();
        expect((await storedFile('schema'))?.path).toBe('resources/schema.xsd');
      });

      it('cancels on Escape and focuses the folder again', async () => {
        const user = userEvent.setup();
        renderComponent();
        await screen.findByTestId('explorer-folder-resources');

        await user.click(screen.getByTestId(`explorer-rename-${toFolderId('resources')}`));
        await user.keyboard('x{Escape}');

        expect(screen.queryByRole('textbox', { name: 'Rename folder' })).not.toBeInTheDocument();
        expect(screen.getByTestId('explorer-folder-resources')).toHaveFocus();
      });
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
      ['a taken name', 'error-handler', 'A file or folder with that name already exists'],
      ['the name of a folder', '{Clear}routes', 'A file or folder with that name already exists'],
      ['the name of an empty folder', '{Clear}empty', 'A file or folder with that name already exists'],
      ['an empty name', '{Backspace}', 'Enter a file name'],
      ['a name with a slash', 'routes/orders', 'A file name cannot contain / or \\'],
    ])('shows an error for %s and keeps the field open on Enter', async (_, typed, error) => {
      await filesStore.createFolder('integrations/empty');
      const user = userEvent.setup();
      renderComponent();
      await expandIntegrations(user);

      const input = await startRenaming(user);
      if (typed === '{Backspace}') await user.clear(input);
      else if (typed.startsWith('{Clear}')) {
        await user.clear(input);
        await user.keyboard(typed.slice('{Clear}'.length));
      } else await user.keyboard(typed);
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

  describe('creating inline', () => {
    const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
    const storedPaths = async () => (await filesStore.getFiles()).map(({ path }) => path);

    /** Serves the catalog index, the templates manifest and a Camel route template */
    const serveCatalog = (template: Response | undefined = new Response('- route:\n    id: route-__KAOTO_ID__\n')) => {
      vi.stubGlobal(
        'fetch',
        vi.fn((url: URL) => {
          const { pathname } = url;
          if (pathname === '/camel-catalog/index.json') {
            return Promise.resolve(
              new Response(JSON.stringify({ starterTemplates: 'starter-templates/index-1.json' })),
            );
          }
          if (pathname === '/camel-catalog/starter-templates/index-1.json') {
            const catalogs = { 'camel-route-yaml': { file: 'camel-route-yaml-hash.yaml' } };
            return Promise.resolve(new Response(JSON.stringify({ catalogs })));
          }
          if (pathname.endsWith('/camel-route-yaml-hash.yaml') && template) return Promise.resolve(template);
          return Promise.resolve(new Response(null, { status: 404 }));
        }),
      );
    };

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const nameInput = () => screen.getByTestId('explorer-new-input');

    it('shows New file and New folder buttons in the toolbar', async () => {
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');

      expect(screen.getByRole('button', { name: 'New file' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument();
    });

    it('creates an empty file at the root with one click, a name and Enter', async () => {
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New file' }));
      expect(nameInput()).toHaveFocus();
      expect(nameInput()).toHaveValue('');
      expect(nameInput()).not.toHaveAttribute('data-invalid');
      await user.keyboard('notes.txt{Enter}');

      await waitFor(async () => {
        expect(await storedPaths()).toContain('notes.txt');
      });
      const created = (await filesStore.getFiles()).find(({ path }) => path === 'notes.txt')!;
      expect(created.content).toBe('');
      expect(screen.queryByTestId('explorer-new-input')).not.toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId(`explorer-file-${created.id}`)).toHaveFocus();
      });
      // A document does not open
      expect(screen.getByTestId('location').textContent).toBe('/workspace');
    });

    it('creates a folder that stays after a reload, even while it is empty', async () => {
      const user = userEvent.setup();
      const { unmount } = renderComponent();
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New folder' }));
      await user.keyboard('schemas{Enter}');

      await waitFor(async () => {
        expect(await filesStore.getFolders()).toContain('schemas');
      });
      await waitFor(() => {
        expect(screen.getByTestId('explorer-folder-schemas')).toHaveFocus();
      });

      unmount();
      renderComponent();
      expect(await screen.findByTestId('explorer-folder-schemas')).toBeInTheDocument();
    });

    it('creates the entry in the focused folder and expands it', async () => {
      const user = userEvent.setup();
      renderComponent();
      const folder = await screen.findByTestId('explorer-folder-resources');
      folder.focus();

      await user.click(screen.getByRole('button', { name: 'New folder' }));

      expect(folder).toHaveAttribute('aria-expanded', 'true');
      expect(folder).toContainElement(nameInput());
      await user.keyboard('xslt{Enter}');
      await waitFor(async () => {
        expect(await filesStore.getFolders()).toContain('resources/xslt');
      });
    });

    it('creates the entry in the folder of the focused file', async () => {
      const user = userEvent.setup();
      renderComponent();
      const folderNode = await screen.findByTestId('explorer-folder-integrations');
      await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
      screen.getByTestId('explorer-file-main-flow').focus();

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('readme.md{Enter}');

      await waitFor(async () => {
        expect(await storedPaths()).toContain('integrations/readme.md');
      });
    });

    it('creates the entry in the folder of the open file when no tree item had the focus', async () => {
      const user = userEvent.setup();
      renderWithNavigation(undefined, '/workspace/file/rest-api');
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('notes.txt{Enter}');

      await waitFor(async () => {
        expect(await storedPaths()).toContain('integrations/routes/notes.txt');
      });
    });

    it('forgets the focused folder once another file opens, also after coming back to the first one', async () => {
      const OpenFileButtons = () => {
        const navigate = useNavigate();
        return (
          <>
            <button onClick={() => void navigate('/workspace/file/main-flow')}>Open main-flow</button>
            <button onClick={() => void navigate('/workspace/file/rest-api')}>Open rest-api</button>
          </>
        );
      };
      const user = userEvent.setup();
      renderWithNavigation(<OpenFileButtons />, '/workspace/file/rest-api');
      (await screen.findByTestId('explorer-folder-resources')).focus();
      await user.click(screen.getByRole('button', { name: 'Open main-flow' }));
      await user.click(screen.getByRole('button', { name: 'Open rest-api' }));

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('notes.txt{Enter}');

      await waitFor(async () => {
        expect(await storedPaths()).toContain('integrations/routes/notes.txt');
      });
      expect(await storedPaths()).not.toContain('resources/notes.txt');
    });

    it('starts a known file type from its template and opens it', async () => {
      serveCatalog();
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('orders.camel.yaml{Enter}');

      await waitFor(async () => {
        expect(await storedPaths()).toContain('orders.camel.yaml');
      });
      const created = (await filesStore.getFiles()).find(({ path }) => path === 'orders.camel.yaml')!;
      expect(created.content).toMatch(/^- route:\n {4}id: route-\d+\n$/);
      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toBe(`/workspace/file/${created.id}`);
      });
    });

    it('keeps the field open with the error when the template cannot be loaded', async () => {
      serveCatalog(new Response(null, { status: 500 }));
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('orders.camel.yaml{Enter}');

      expect(await screen.findByText(/Could not load/)).toBeInTheDocument();
      expect(nameInput()).toHaveFocus();
      expect(await storedPaths()).not.toContain('orders.camel.yaml');
    });

    it.each([
      ['New file', 'a taken file name', 'integrations', 'A file or folder with that name already exists'],
      ['New folder', 'the name of a file', 'main-flow.camel.yaml', 'A file or folder with that name already exists'],
      ['New file', 'a name with a slash', 'a/b.txt', 'A file name cannot contain / or \\'],
      ['New folder', 'an empty name', '', 'Enter a folder name'],
    ])('%s shows an error for %s and keeps the field open on Enter', async (button, _, typed, error) => {
      const user = userEvent.setup();
      renderComponent();
      const folderNode = await screen.findByTestId('explorer-folder-integrations');
      if (typed === 'main-flow.camel.yaml') folderNode.focus();

      await user.click(screen.getByRole('button', { name: button }));
      if (typed) await user.keyboard(typed);
      await user.keyboard('{Enter}');

      expect(screen.getByText(error)).toBeInTheDocument();
      expect(nameInput()).toHaveFocus();
    });

    it('keeps creating a file when Escape is pressed while its template loads', async () => {
      let sendTemplate: (template: Response) => void = () => undefined;
      serveCatalog(undefined);
      const servedFetch = vi.mocked(fetch).getMockImplementation()!;
      vi.mocked(fetch).mockImplementation((url) =>
        String(url).endsWith('/camel-route-yaml-hash.yaml')
          ? new Promise<Response>((resolve) => {
              sendTemplate = resolve;
            })
          : servedFetch(url),
      );
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('orders.camel.yaml{Enter}');
      await user.keyboard('{Escape}');
      expect(nameInput()).toBeInTheDocument();
      sendTemplate(new Response('- route:\n    id: route-__KAOTO_ID__\n'));

      await waitFor(() => {
        expect(screen.getByTestId('location').textContent).toMatch(/^\/workspace\/file\//);
      });
      expect(await storedPaths()).toContain('orders.camel.yaml');
    });

    it('creates the entry in the folder of a file opened outside the tree after a folder had the focus', async () => {
      const OpenRestApi = () => {
        const navigate = useNavigate();
        return (
          <button type="button" onClick={() => void navigate('/workspace/file/rest-api')}>
            open rest-api
          </button>
        );
      };
      const user = userEvent.setup();
      renderWithNavigation(<OpenRestApi />);
      (await screen.findByTestId('explorer-folder-resources')).focus();

      await user.click(screen.getByRole('button', { name: 'open rest-api' }));
      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('notes.txt{Enter}');

      await waitFor(async () => {
        expect(await storedPaths()).toContain('integrations/routes/notes.txt');
      });
    });

    it('creates a top-level folder after a click on the free space of the tree, also right after creating a folder', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');
      await user.click(screen.getByRole('button', { name: 'New folder' }));
      await user.keyboard('routes{Enter}');
      await waitFor(() => {
        expect(screen.getByTestId('explorer-folder-routes')).toHaveFocus();
      });

      await user.click(screen.getByTestId('explorer-tree'));
      await user.click(screen.getByRole('button', { name: 'New folder' }));
      await user.keyboard('other{Enter}');

      await waitFor(async () => {
        expect(await filesStore.getFolders()).toContain('other');
      });
      expect(await filesStore.getFolders()).not.toContain('routes/other');
    });

    it('creates a top-level file after a click on the free space of the tree while a file in a folder is open', async () => {
      const user = userEvent.setup();
      renderWithNavigation(undefined, '/workspace/file/rest-api');
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByTestId('explorer-tree'));
      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('notes.txt{Enter}');

      await waitFor(async () => {
        expect(await storedPaths()).toContain('notes.txt');
      });
    });

    it('creates the entry when the field loses the focus with a name that can be used', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New folder' }));
      await user.keyboard('schemas');
      await user.click(screen.getByRole('searchbox'));

      expect(await screen.findByTestId('explorer-folder-schemas')).toBeInTheDocument();
      // Leaving the field keeps the focus where the user put it
      expect(screen.getByRole('searchbox')).toHaveFocus();
    });

    it('creates the entry at the root once the folder that had the focus was renamed away', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-resources');
      // Renaming by leaving the field keeps the old folder as the last focused tree item
      await user.click(screen.getByTestId(`explorer-rename-${toFolderId('resources')}`));
      await user.clear(screen.getByRole('textbox', { name: 'Rename folder' }));
      await user.keyboard('assets');
      await user.click(screen.getByRole('searchbox'));
      await screen.findByTestId('explorer-folder-assets');

      await user.click(screen.getByRole('button', { name: 'New folder' }));
      await user.keyboard('schemas{Enter}');

      await waitFor(async () => {
        expect(await filesStore.getFolders()).toContain('schemas');
      });
    });

    it('cancels on Escape and gives the focus back to the button', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New folder' }));
      await user.keyboard('draft{Escape}');

      expect(screen.queryByTestId('explorer-new-input')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'New folder' })).toHaveFocus();
      expect(await filesStore.getFolders()).not.toContain('draft');
    });

    it('cancels when the field loses the focus while it is empty', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.click(screen.getByRole('searchbox'));

      expect(screen.queryByTestId('explorer-new-input')).not.toBeInTheDocument();
      expect(await storedPaths()).toHaveLength(TEST_FILES.length);
    });

    it('clears the search so that the new entry shows', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-folder-integrations');
      await user.type(screen.getByRole('searchbox'), 'kafka');

      await user.click(screen.getByRole('button', { name: 'New file' }));

      expect(screen.getByRole('searchbox')).toHaveValue('');
      expect(nameInput()).toBeVisible();
    });

    it('creates a folder in an empty workspace', async () => {
      resetTestIndexedDB();
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTestId('explorer-empty');

      await user.click(screen.getByRole('button', { name: 'New folder' }));
      await user.keyboard('routes{Enter}');

      expect(await screen.findByTestId('explorer-folder-routes')).toBeInTheDocument();
      expect(screen.queryByTestId('explorer-empty')).not.toBeInTheDocument();
    });

    it('edits the name with Backspace and Delete instead of asking to delete a tree item', async () => {
      const user = userEvent.setup();
      renderComponent();
      (await screen.findByTestId('explorer-folder-resources')).focus();

      await user.click(screen.getByRole('button', { name: 'New file' }));
      await user.keyboard('ab{Backspace}{ArrowLeft}{Delete}');

      expect(nameInput()).toHaveValue('');
      expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
    });
  });
});
