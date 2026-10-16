import { act, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { IntegrationHeaderContext, ViewMode } from '../../context/IntegrationHeaderContext';
import IntegrationShell from './IntegrationShell';

const mockSetBreadcrumbItems = vi.fn();
const mockSetCurrent = vi.fn();
const mockSetViewMode = vi.fn();

const renderWithContext = (
  projectId = 'my-project',
  integrationId = 'main-flow',
  viewMode: ViewMode = 'design',
  extra?: ReactNode,
) =>
  render(
    <IntegrationHeaderContext.Provider
      value={{
        breadcrumbItems: [],
        current: '',
        viewMode,
        setViewMode: mockSetViewMode,
        setBreadcrumbItems: mockSetBreadcrumbItems,
        setCurrent: mockSetCurrent,
      }}
    >
      <MemoryRouter initialEntries={[`/projects/${projectId}/integration/${integrationId}`]}>
        {extra}
        <Routes>
          <Route path="/" element={<div data-testid="root-page" />} />
          <Route path="/projects/:projectId/integration/:integrationId" element={<IntegrationShell />} />
        </Routes>
      </MemoryRouter>
    </IntegrationHeaderContext.Provider>,
  );

describe('IntegrationShell', () => {
  it('renders the shell and body', () => {
    renderWithContext();
    expect(screen.getByTestId('integration-shell')).toBeInTheDocument();
    expect(screen.getByTestId('integration-body')).toBeInTheDocument();
  });

  it('does not render its own toolbar — switcher is in ProjectToolbar', () => {
    renderWithContext();
    expect(screen.queryByTestId('integration-shell-toolbar')).not.toBeInTheDocument();
  });

  it('publishes full folder path as breadcrumb to context on mount', () => {
    renderWithContext('my-project', 'main-flow');
    expect(mockSetBreadcrumbItems).toHaveBeenCalledWith([{ label: 'Integrations', href: '/projects/my-project' }]);
    expect(mockSetCurrent).toHaveBeenCalledWith('main-flow.camel.yaml');
  });

  it('publishes deep nested path for deeply nested integrations', () => {
    renderWithContext('my-project', 'kafka-consumer');
    expect(mockSetBreadcrumbItems).toHaveBeenCalledWith([
      { label: 'Integrations', href: '/projects/my-project' },
      { label: 'routes', href: '/projects/my-project' },
      { label: 'async', href: '/projects/my-project' },
    ]);
    expect(mockSetCurrent).toHaveBeenCalledWith('kafka-consumer.camel.yaml');
  });

  it('falls back to projectId when integration id is not in the file tree', () => {
    renderWithContext('my-project', 'unknown-id');
    expect(mockSetBreadcrumbItems).toHaveBeenCalledWith([{ label: 'my-project', href: '/projects/my-project' }]);
    expect(mockSetCurrent).toHaveBeenCalledWith('unknown-id');
  });

  it('resets viewMode to design on mount', () => {
    renderWithContext('my-project', 'main-flow');
    expect(mockSetViewMode).toHaveBeenCalledWith('design');
  });

  it('resets viewMode to design when navigating to a different integration', () => {
    // NavCapture is rendered inside the same MemoryRouter so navigate() works in context.
    let navigateTo: (path: string) => void = () => {};
    const NavCapture = () => {
      navigateTo = useNavigate();
      return null;
    };
    renderWithContext('my-project', 'error-handler', 'code', <NavCapture />);
    mockSetViewMode.mockClear();
    act(() => {
      navigateTo('/projects/my-project/integration/main-flow');
    });
    expect(mockSetViewMode).toHaveBeenCalledWith('design');
  });

  it('clears context on unmount', () => {
    const { unmount } = renderWithContext('my-project', 'main-flow');
    unmount();
    expect(mockSetBreadcrumbItems).toHaveBeenLastCalledWith([]);
    expect(mockSetCurrent).toHaveBeenLastCalledWith('');
  });

  it('redirects to root for invalid params', () => {
    renderWithContext('my-project', 'INVALID%20ID');
    expect(screen.getByTestId('root-page')).toBeInTheDocument();
    expect(screen.queryByTestId('integration-shell')).not.toBeInTheDocument();
  });
});
