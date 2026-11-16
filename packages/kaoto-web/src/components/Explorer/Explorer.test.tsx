import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';

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
const renderWithNavigation = (children?: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/workspace']}>
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

  it('renders toolbar with Add button and Search, without Delete', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Add integration' })).toBeInTheDocument();
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
});
