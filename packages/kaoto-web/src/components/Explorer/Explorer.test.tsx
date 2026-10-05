import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { filterFiles } from '../../stubs/explorer/filterFiles';
import { STUB_FILES } from '../../stubs/explorer/index';
import { Explorer } from './Explorer';

const renderComponent = (projectId = 'my-project') =>
  render(
    <MemoryRouter initialEntries={[`/projects/${projectId}`]}>
      <Routes>
        <Route path="/projects/:projectId" element={<Explorer />} />
      </Routes>
    </MemoryRouter>,
  );

describe('filterFiles', () => {
  it('returns all files when query is empty', () => {
    expect(filterFiles(STUB_FILES, '')).toEqual(STUB_FILES);
  });

  it('filters leaf nodes by name', () => {
    const result = filterFiles(STUB_FILES, 'main');
    expect(result).toHaveLength(1);
    expect(result[0].children?.some((c) => c.name.includes('main'))).toBe(true);
  });

  it('includes a folder when its name matches even if no children match', () => {
    const result = filterFiles(STUB_FILES, 'resources');
    expect(result.some((n) => n.id === 'resources')).toBe(true);
  });

  it('recurses into nested folders', () => {
    const result = filterFiles(STUB_FILES, 'rest-api');
    const integrations = result.find((n) => n.id === 'integrations');
    expect(integrations).toBeDefined();
    const routes = integrations?.children?.find((c) => c.id === 'routes');
    expect(routes).toBeDefined();
    expect(routes?.children?.some((c) => c.id === 'rest-api')).toBe(true);
  });
});

describe('Explorer', () => {
  it.each(['explorer', 'route-selector-area', 'explorer-folder-integrations', 'explorer-folder-resources'])(
    'renders %s',
    (testId) => {
      renderComponent();
      expect(screen.getByTestId(testId)).toBeInTheDocument();
    },
  );

  it('renders toolbar controls with accessible names', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Add integration' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search files' })).toBeInTheDocument();
  });

  it('filters files by search query and expands the matching folder', async () => {
    const user = userEvent.setup();
    renderComponent();
    const search = screen.getByRole('searchbox');
    await user.type(search, 'main');
    expect(screen.getByTestId('explorer-file-main-flow')).toBeInTheDocument();
    expect(screen.queryByTestId('explorer-file-error-handler')).not.toBeInTheDocument();
    expect(screen.getByTestId('explorer-folder-integrations')).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the folder expanded after navigating to an integration', async () => {
    const LocationDisplay = () => <div data-testid="location">{useLocation().pathname}</div>;
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/projects/my-project']}>
        <Routes>
          <Route
            path="/projects/:projectId/*"
            element={
              <>
                <Explorer />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    const folderNode = screen.getByTestId('explorer-folder-integrations');
    await user.click(folderNode.querySelector('.cds--tree-parent-node__toggle')!);
    expect(folderNode).toHaveAttribute('aria-expanded', 'true');

    await user.click(screen.getByText('main-flow.camel.yaml'));
    expect(screen.getByTestId('location')).toHaveTextContent('/projects/my-project/integration/main-flow');
    expect(screen.getByTestId('explorer-folder-integrations')).toHaveAttribute('aria-expanded', 'true');
  });
});
