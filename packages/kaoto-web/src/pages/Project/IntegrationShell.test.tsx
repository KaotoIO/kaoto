import * as KaotoComponentsModule from '@kaoto/kaoto/components';
import { act, render, screen } from '@testing-library/react';
import { FunctionComponent, ReactNode, useEffect } from 'react';
import { MemoryRouter, NavigateFunction, Route, Routes, useNavigate } from 'react-router';
import { beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';

import { IntegrationHeaderContext, ViewMode } from '../../context/IntegrationHeaderContext';
import { getStubIntegrationContent } from '../../stubs/integrations';
import IntegrationShell from './IntegrationShell';

let routeVisualizationSpy: MockInstance<typeof KaotoComponentsModule.RouteVisualization>;
let routeVisualizationMounts = 0;

const RouteVisualizationStub: typeof KaotoComponentsModule.RouteVisualization = ({ code }) => {
  useEffect(() => {
    routeVisualizationMounts++;
  }, []);
  return <div data-testid="route-visualization" data-code={code} />;
};

beforeEach(() => {
  routeVisualizationMounts = 0;
  routeVisualizationSpy = vi
    .spyOn(KaotoComponentsModule, 'RouteVisualization')
    .mockImplementation(RouteVisualizationStub);
});

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

/** Rendered inside the router to hand its navigate function to the test */
const NavCapture: FunctionComponent<{ onNavigate: (navigate: NavigateFunction) => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  useEffect(() => {
    onNavigate(navigate);
  }, [navigate, onNavigate]);
  return null;
};

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
    renderWithContext(
      'my-project',
      'error-handler',
      'code',
      <NavCapture onNavigate={(navigate) => (navigateTo = navigate)} />,
    );
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

  it('renders the route visualization in design mode without an integration header', () => {
    render(
      <MemoryRouter initialEntries={['/projects/my-project/integration/main-flow']}>
        <Routes>
          <Route path="/projects/:projectId/integration/:integrationId" element={<IntegrationShell />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('route-visualization')).toHaveAttribute(
      'data-code',
      getStubIntegrationContent('main-flow'),
    );
  });

  it('renders the route visualization with the stub content in design mode', () => {
    renderWithContext('my-project', 'main-flow');
    const canvas = screen.getByTestId('route-visualization');
    expect(canvas).toHaveAttribute('data-code', getStubIntegrationContent('main-flow'));
    const { catalogUrl } = routeVisualizationSpy.mock.lastCall![0];
    expect(catalogUrl).toMatch(/^\/.*camel-catalog\/index\.json$/);
  });

  it('shows an empty state when the integration has no content', () => {
    renderWithContext('my-project', 'order-test');
    expect(screen.getByText('No preview available')).toBeInTheDocument();
    expect(screen.queryByTestId('route-visualization')).not.toBeInTheDocument();
  });

  it('does not render the canvas outside design mode', () => {
    renderWithContext('my-project', 'main-flow', 'code');
    expect(screen.queryByTestId('route-visualization')).not.toBeInTheDocument();
  });

  it('shows the content of the newly selected integration when switching', () => {
    let navigateTo: (path: string) => void = () => {};
    renderWithContext(
      'my-project',
      'error-handler',
      'design',
      <NavCapture onNavigate={(navigate) => (navigateTo = navigate)} />,
    );
    expect(screen.getByTestId('route-visualization')).toHaveAttribute(
      'data-code',
      getStubIntegrationContent('error-handler'),
    );
    act(() => {
      navigateTo('/projects/my-project/integration/main-flow');
    });
    expect(screen.getByTestId('route-visualization')).toHaveAttribute(
      'data-code',
      getStubIntegrationContent('main-flow'),
    );
  });

  it('keeps the canvas mounted when switching integration so the catalog is not reloaded', () => {
    let navigateTo: (path: string) => void = () => {};
    renderWithContext(
      'my-project',
      'error-handler',
      'design',
      <NavCapture onNavigate={(navigate) => (navigateTo = navigate)} />,
    );
    act(() => {
      navigateTo('/projects/my-project/integration/main-flow');
    });
    expect(routeVisualizationMounts).toBe(1);
  });

  it('redirects to root for invalid params', () => {
    renderWithContext('my-project', 'INVALID%20ID');
    expect(screen.getByTestId('root-page')).toBeInTheDocument();
    expect(screen.queryByTestId('integration-shell')).not.toBeInTheDocument();
  });
});
