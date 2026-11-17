import * as KaotoComponentsModule from '@kaoto/kaoto/components';
import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { FunctionComponent, ReactNode, useEffect } from 'react';
import { MemoryRouter, NavigateFunction, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';

import { IntegrationHeaderContext, ViewMode } from '../../context/IntegrationHeaderContext';
import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, TEST_FILES, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import IntegrationShell from './IntegrationShell';

let routeVisualizationSpy: MockInstance<typeof KaotoComponentsModule.RouteVisualization>;
let routeVisualizationMounts = 0;

const RouteVisualizationStub: typeof KaotoComponentsModule.RouteVisualization = ({ code }) => {
  useEffect(() => {
    routeVisualizationMounts++;
  }, []);
  return <div data-testid="route-visualization" data-code={code} />;
};

/** The code change callback the canvas got last, as if the user edited the route on the canvas */
const editOnCanvas = (code: string) => {
  act(() => {
    routeVisualizationSpy.mock.lastCall![0].codeChange(code);
  });
};

const contentOf = (id: string) => TEST_FILES.find((file) => file.id === id)!.content;

beforeEach(() => {
  routeVisualizationMounts = 0;
  routeVisualizationSpy = vi
    .spyOn(KaotoComponentsModule, 'RouteVisualization')
    .mockImplementation(RouteVisualizationStub);
});

const mockSetBreadcrumbItems = vi.fn();
const mockSetCurrent = vi.fn();
const mockSetViewMode = vi.fn();

const renderWithContext = (fileId = 'main-flow', viewMode: ViewMode = 'design', extra?: ReactNode) =>
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
      <MemoryRouter initialEntries={[`/workspace/file/${fileId}`]}>
        {extra}
        {withFiles(
          <Routes>
            <Route path="/workspace" element={<div data-testid="workspace-page" />} />
            <Route path="/workspace/file/:fileId" element={<IntegrationShell />} />
          </Routes>,
        )}
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
  beforeEach(async () => {
    resetTestIndexedDB();
    await storeTestFiles();
    mockSetBreadcrumbItems.mockClear();
    mockSetCurrent.mockClear();
    mockSetViewMode.mockClear();
  });

  it('renders the shell and body', async () => {
    renderWithContext();
    expect(screen.getByTestId('integration-shell')).toBeInTheDocument();
    expect(screen.getByTestId('integration-body')).toBeInTheDocument();
    expect(await screen.findByTestId('route-visualization')).toBeInTheDocument();
  });

  it('does not render its own toolbar — switcher is in ProjectToolbar', async () => {
    renderWithContext();
    expect(screen.queryByTestId('integration-shell-toolbar')).not.toBeInTheDocument();
    expect(await screen.findByTestId('route-visualization')).toBeInTheDocument();
  });

  it('shows a loading state until the files are loaded', async () => {
    renderWithContext();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(await screen.findByTestId('route-visualization')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('publishes full folder path as breadcrumb to context on mount', async () => {
    renderWithContext('main-flow');
    await waitFor(() => {
      expect(mockSetCurrent).toHaveBeenLastCalledWith('main-flow.camel.yaml');
    });
    expect(mockSetBreadcrumbItems).toHaveBeenLastCalledWith([{ label: 'integrations', href: '/workspace' }]);
  });

  it('publishes deep nested path for deeply nested files', async () => {
    renderWithContext('kafka-consumer');
    await waitFor(() => {
      expect(mockSetCurrent).toHaveBeenLastCalledWith('kafka-consumer.camel.yaml');
    });
    expect(mockSetBreadcrumbItems).toHaveBeenLastCalledWith([
      { label: 'integrations', href: '/workspace' },
      { label: 'routes', href: '/workspace' },
      { label: 'async', href: '/workspace' },
    ]);
  });

  it('publishes no breadcrumb while the files are loading', () => {
    renderWithContext('main-flow');
    expect(mockSetBreadcrumbItems).toHaveBeenLastCalledWith([]);
    expect(mockSetCurrent).toHaveBeenLastCalledWith('');
  });

  it('tells that a file does not exist and publishes no breadcrumb for it', async () => {
    renderWithContext('unknown-id');

    expect(await screen.findByText('The file does not exist')).toBeInTheDocument();
    expect(mockSetBreadcrumbItems).toHaveBeenLastCalledWith([]);
    expect(mockSetCurrent).toHaveBeenLastCalledWith('');
    expect(screen.queryByTestId('route-visualization')).not.toBeInTheDocument();
  });

  it('resets the view mode only once per opened file', async () => {
    renderWithContext('main-flow');
    await waitFor(() => {
      expect(mockSetCurrent).toHaveBeenLastCalledWith('main-flow.camel.yaml');
    });
    expect(mockSetViewMode).toHaveBeenCalledTimes(1);
  });

  it('resets viewMode to design on mount', async () => {
    renderWithContext('main-flow');
    expect(mockSetViewMode).toHaveBeenCalledWith('design');
    expect(await screen.findByTestId('route-visualization')).toBeInTheDocument();
  });

  it('resets viewMode to design when navigating to a different file', async () => {
    // NavCapture is rendered inside the same MemoryRouter so navigate() works in context.
    let navigateTo: (path: string) => void = () => {};
    renderWithContext('error-handler', 'code', <NavCapture onNavigate={(navigate) => (navigateTo = navigate)} />);
    await waitFor(() => {
      expect(mockSetCurrent).toHaveBeenLastCalledWith('error-handler.camel.yaml');
    });
    mockSetViewMode.mockClear();
    act(() => {
      navigateTo('/workspace/file/main-flow');
    });
    expect(mockSetViewMode).toHaveBeenCalledWith('design');
  });

  it('clears context on unmount', async () => {
    const { unmount } = renderWithContext('main-flow');
    await screen.findByTestId('route-visualization');
    unmount();
    expect(mockSetBreadcrumbItems).toHaveBeenLastCalledWith([]);
    expect(mockSetCurrent).toHaveBeenLastCalledWith('');
  });

  it('renders the route visualization in design mode without an integration header', async () => {
    render(
      <MemoryRouter initialEntries={['/workspace/file/main-flow']}>
        {withFiles(
          <Routes>
            <Route path="/workspace/file/:fileId" element={<IntegrationShell />} />
          </Routes>,
        )}
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('route-visualization')).toHaveAttribute('data-code', contentOf('main-flow'));
  });

  it('renders the route visualization with the stored content in design mode', async () => {
    renderWithContext('main-flow');
    const canvas = await screen.findByTestId('route-visualization');
    expect(canvas).toHaveAttribute('data-code', contentOf('main-flow'));
    const { catalogUrl } = routeVisualizationSpy.mock.lastCall![0];
    expect(catalogUrl).toMatch(/^\/.*camel-catalog\/index\.json$/);
  });

  it('renders a Citrus test on the canvas', async () => {
    renderWithContext('order-test');
    expect(await screen.findByTestId('route-visualization')).toHaveAttribute('data-code', contentOf('order-test'));
    expect(screen.queryByText('No preview available')).not.toBeInTheDocument();
  });

  it('shows an empty state for a document', async () => {
    renderWithContext('schema');
    expect(await screen.findByText('No preview available')).toBeInTheDocument();
    expect(screen.queryByTestId('route-visualization')).not.toBeInTheDocument();
  });

  it('does not render the canvas outside design mode', async () => {
    renderWithContext('main-flow', 'code');
    await waitFor(() => {
      expect(mockSetCurrent).toHaveBeenLastCalledWith('main-flow.camel.yaml');
    });
    expect(screen.queryByTestId('route-visualization')).not.toBeInTheDocument();
  });

  it('shows the content of the newly selected file when switching', async () => {
    let navigateTo: (path: string) => void = () => {};
    renderWithContext('error-handler', 'design', <NavCapture onNavigate={(navigate) => (navigateTo = navigate)} />);
    expect(await screen.findByTestId('route-visualization')).toHaveAttribute('data-code', contentOf('error-handler'));
    act(() => {
      navigateTo('/workspace/file/main-flow');
    });
    expect(screen.getByTestId('route-visualization')).toHaveAttribute('data-code', contentOf('main-flow'));
  });

  it('keeps the canvas mounted when switching files so the catalog is not reloaded', async () => {
    let navigateTo: (path: string) => void = () => {};
    renderWithContext('error-handler', 'design', <NavCapture onNavigate={(navigate) => (navigateTo = navigate)} />);
    await screen.findByTestId('route-visualization');
    act(() => {
      navigateTo('/workspace/file/main-flow');
    });
    expect(routeVisualizationMounts).toBe(1);
  });

  describe('saving', () => {
    // clearMocks keeps the mocked implementations, and the store is shared by all tests
    afterEach(() => {
      vi.restoreAllMocks();
    });

    const storedContent = async (id: string) => (await filesStore.getFiles()).find((file) => file.id === id)?.content;

    it('stores the code edited on the canvas', async () => {
      renderWithContext('main-flow');
      await screen.findByTestId('route-visualization');

      editOnCanvas('- route:\n    id: edited\n');

      await waitFor(async () => {
        expect(await storedContent('main-flow')).toBe('- route:\n    id: edited\n');
      });
      expect(screen.getByTestId('route-visualization')).toHaveAttribute('data-code', '- route:\n    id: edited\n');
    });

    it('does not store the code again when the canvas reports the code it was given', async () => {
      const updateFile = vi.spyOn(filesStore, 'updateFile');
      renderWithContext('main-flow');
      await screen.findByTestId('route-visualization');

      editOnCanvas(contentOf('main-flow'));

      expect(updateFile).not.toHaveBeenCalled();
    });

    it('keeps the edits of a file after switching to another file and back', async () => {
      let navigateTo: (path: string) => void = () => {};
      renderWithContext('main-flow', 'design', <NavCapture onNavigate={(navigate) => (navigateTo = navigate)} />);
      await screen.findByTestId('route-visualization');
      editOnCanvas('edited main-flow');
      await waitFor(async () => {
        expect(await storedContent('main-flow')).toBe('edited main-flow');
      });

      act(() => {
        navigateTo('/workspace/file/error-handler');
      });
      act(() => {
        navigateTo('/workspace/file/main-flow');
      });

      expect(screen.getByTestId('route-visualization')).toHaveAttribute('data-code', 'edited main-flow');
      expect(await storedContent('error-handler')).toBe(contentOf('error-handler'));
    });

    it('shows an error when the code cannot be stored and hides it on close', async () => {
      vi.spyOn(filesStore, 'updateFile').mockRejectedValue(new Error('quota exceeded'));
      const user = userEvent.setup();
      renderWithContext('main-flow');
      await screen.findByTestId('route-visualization');

      editOnCanvas('edited');

      const notification = await screen.findByTestId('integration-save-error');
      expect(notification).toHaveTextContent('Could not save the file');
      expect(notification).toHaveTextContent('quota exceeded');

      await user.click(screen.getByRole('button', { name: /close notification/i }));
      expect(screen.queryByTestId('integration-save-error')).not.toBeInTheDocument();
    });

    it('hides the error after the next edit is stored', async () => {
      vi.spyOn(filesStore, 'updateFile').mockRejectedValueOnce('blocked by the browser');
      renderWithContext('main-flow');
      await screen.findByTestId('route-visualization');

      editOnCanvas('first');
      expect(await screen.findByTestId('integration-save-error')).toHaveTextContent('blocked by the browser');

      editOnCanvas('second');

      await waitFor(() => {
        expect(screen.queryByTestId('integration-save-error')).not.toBeInTheDocument();
      });
      expect(await storedContent('main-flow')).toBe('second');
    });
  });

  it('redirects to the workspace for invalid params', () => {
    renderWithContext('INVALID%20ID');
    expect(screen.getByTestId('workspace-page')).toBeInTheDocument();
    expect(screen.queryByTestId('integration-shell')).not.toBeInTheDocument();
  });
});
