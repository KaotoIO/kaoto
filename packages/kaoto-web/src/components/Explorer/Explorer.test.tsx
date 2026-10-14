import { act, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';

import { STUB_FILES } from '../../stubs/explorer/index';
import { Explorer } from './Explorer';
import { filterFiles } from './filterFiles';

const renderComponent = (projectId = 'my-project') =>
  render(
    <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
      <Routes>
        <Route path="/projects/:projectId" element={<Explorer />} />
      </Routes>
    </MemoryRouter>,
  );

/**
 * Renders Explorer inside a nested route that mirrors the real app structure:
 * - outer Route provides :projectId
 * - inner Route provides :integrationId when navigated to the integration path
 * This ensures useParams() inside Explorer returns integrationId for selection sync.
 */
const renderWithNavigation = (children?: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/projects/my-project']}>
      <Routes>
        <Route
          path="/projects/:projectId"
          element={
            <>
              <Explorer />
              {children}
              <Outlet />
            </>
          }
        >
          <Route index element={null} />
          <Route path="integration/:integrationId" element={null} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('filterFiles', () => {
  it('returns the original array when query is empty', () => {
    expect(filterFiles(STUB_FILES, '')).toBe(STUB_FILES);
  });

  it('returns only nodes whose name contains the query', () => {
    const result = filterFiles(STUB_FILES, 'main');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('integrations');
    expect(result[0].children?.map((c) => c.id)).toEqual(['main-flow']);
  });

  it('excludes non-matching siblings when a child matches', () => {
    const result = filterFiles(STUB_FILES, 'rest-api');
    const routes = result[0].children?.find((c) => c.id === 'routes');
    expect(routes?.children?.map((c) => c.id)).toEqual(['rest-api']);
  });

  it('returns a folder with all its children when the folder name matches', () => {
    const result = filterFiles(STUB_FILES, 'resources');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('resources');
    // All original children are kept so the user can browse folder contents
    expect(result[0].children).toHaveLength(3); // schema, mapping, templates
  });

  it('recurses into 3-level deep folders', () => {
    const result = filterFiles(STUB_FILES, 'kafka');
    const async_ = result[0].children?.find((c) => c.id === 'routes')?.children?.find((c) => c.id === 'async');
    expect(async_?.children?.map((c) => c.id)).toEqual(['kafka-consumer', 'kafka-producer']);
  });

  it('returns empty array when nothing matches', () => {
    expect(filterFiles(STUB_FILES, 'nonexistent-xyz')).toHaveLength(0);
  });

  it('does not mutate the original nodes', () => {
    const original = STUB_FILES[1]; // resources
    filterFiles(STUB_FILES, 'resources');
    expect(original.children).toHaveLength(3); // schema, mapping, templates
  });
});

describe('Explorer', () => {
  it.each(['order-test', 'timer-source', 'orders-pipe', 'legacy-route'])(
    'opens %s (non-camel.yaml canvas resource) on click',
    async (id) => {
      const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
      const user = userEvent.setup();
      renderWithNavigation(<LocationDisplay />);

      const folderNode = screen.getByTestId('explorer-folder-integrations');
      await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
      await user.click(screen.getByTestId(`explorer-file-${id}`));

      expect(screen.getByTestId('location')).toHaveTextContent(`/projects/my-project/integration/${id}`);
    },
  );

  it('renders the sidebar structure', () => {
    renderComponent();
    expect(screen.getByTestId('explorer')).toBeInTheDocument();
    expect(screen.getByTestId('route-selector-area')).toBeInTheDocument();
    expect(screen.getByTestId('explorer-folder-integrations')).toBeInTheDocument();
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

    await user.type(screen.getByRole('searchbox'), 'main');

    expect(screen.getByTestId('explorer-file-main-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('explorer-file-error-handler')).not.toBeInTheDocument();
    expect(screen.getByTestId('explorer-folder-integrations')).toHaveAttribute('aria-expanded', 'true');
  });

  it('navigates to the integration route on file click and keeps the folder expanded', async () => {
    const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
    const user = userEvent.setup();
    renderWithNavigation(<LocationDisplay />);

    const folderNode = screen.getByTestId('explorer-folder-integrations');
    await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
    expect(folderNode).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByText('main-flow.camel.yaml'));
    expect(screen.getByTestId('location')).toHaveTextContent('/projects/my-project/integration/main-flow');
    expect(screen.getByTestId('explorer-folder-integrations')).toHaveAttribute('aria-expanded', 'true');
  });

  it('highlights the active integration derived from the URL', async () => {
    const user = userEvent.setup();
    renderWithNavigation();

    const folderNode = screen.getByTestId('explorer-folder-integrations');
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
    const folderNode = screen.getByTestId('explorer-folder-integrations');
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
});
