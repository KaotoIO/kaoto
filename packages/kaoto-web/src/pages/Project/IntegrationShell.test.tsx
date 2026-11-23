import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { FunctionComponent, ReactNode, useEffect } from 'react';
import { MemoryRouter, NavigateFunction, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IntegrationHeaderContext, ViewMode } from '../../context/IntegrationHeaderContext';
import { filesStore } from '../../services/files/files.store';
import { storeTestFiles, TEST_FILES, withFiles } from '../../test/files';
import { resetTestIndexedDB } from '../../test/indexed-db';
import { stubRouteVisualization } from '../../test/route-visualization-stub';
import IntegrationShell from './IntegrationShell';

let routeVisualization: ReturnType<typeof stubRouteVisualization>;
const editOnCanvas = (code: string) => {
  routeVisualization.editOnCanvas(code);
};

const contentOf = (id: string) => TEST_FILES.find((file) => file.id === id)!.content;

beforeEach(() => {
  routeVisualization = stubRouteVisualization();
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
    const { catalogUrl } = routeVisualization.spy.mock.lastCall![0];
    expect(catalogUrl).toMatch(/^\/.*camel-catalog\/index\.json$/);
  });

  it('renders a Citrus test on the canvas', async () => {
    renderWithContext('order-test');
    expect(await screen.findByTestId('route-visualization')).toHaveAttribute('data-code', contentOf('order-test'));
    expect(screen.queryByRole('textbox', { name: 'Code' })).not.toBeInTheDocument();
  });

  it.each(['schema', 'mapping', 'order-template'])('opens the document %s in the text editor', async (fileId) => {
    renderWithContext(fileId);

    expect(await screen.findByRole('textbox', { name: 'Code' })).toHaveValue(contentOf(fileId));
    expect(screen.queryByTestId('route-visualization')).not.toBeInTheDocument();
  });

  it('opens a document in the text editor in every view mode', async () => {
    renderWithContext('schema', 'code');

    expect(await screen.findByRole('textbox', { name: 'Code' })).toBeInTheDocument();
  });

  it('shows the code of a route in code mode and keeps its canvas mounted but hidden', async () => {
    renderWithContext('main-flow', 'code');

    expect(await screen.findByRole('textbox', { name: 'Code' })).toHaveValue(contentOf('main-flow'));
    expect(screen.getByTestId('route-visualization')).not.toBeVisible();
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
    expect(routeVisualization.mountCount()).toBe(1);
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

    it('stores the text edited in the text editor', async () => {
      renderWithContext('order-template');
      const editor = await screen.findByRole('textbox', { name: 'Code' });

      fireEvent.change(editor, { target: { value: '{ "order": 1 }' } });

      await waitFor(async () => {
        expect(await storedContent('order-template')).toBe('{ "order": 1 }');
      });
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
