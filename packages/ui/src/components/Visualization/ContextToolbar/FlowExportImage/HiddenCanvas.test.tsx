import { GRAPH_LAYOUT_END_EVENT, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { act, render, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock, MockInstance } from 'vitest';

import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { TestProvidersWrapper } from '../../../../stubs';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { HiddenCanvas } from './HiddenCanvas';

describe('HiddenCanvas', () => {
  /** Notifies the end of the graph layout */
  const fireLayoutEnd = () => {
    hostController.fireEvent(GRAPH_LAYOUT_END_EVENT, { graph: hostController.getGraph() });
  };

  const entity = new CamelRouteVisualEntity(camelRouteJson);

  let mockOnComplete: Mock;
  /** The controller of the canvas hosting the hidden canvas, where it listens for the layout end */
  let hostController: Visualization;
  let Wrapper: FunctionComponent<PropsWithChildren>;
  let fromModelSpy: MockInstance;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let clickSpy: MockInstance;
  let createControllerSpy: MockInstance<typeof ControllerService.createController>;

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Save original implementations
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    // Mock requestAnimationFrame to execute synchronously
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(globalThis, 'clearTimeout').mockImplementation(() => {});

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mockOnComplete = vi.fn();

    vi.mocked(toBlob).mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' }));
    /* jsdom has no SVG layout, give the exported <svg> a size */
    vi.spyOn(SVGSVGElement.prototype, 'getBBox').mockReturnValue(new DOMRect(0, 0, 100, 100));

    hostController = ControllerService.createController();
    const { Provider } = await TestProvidersWrapper();
    Wrapper = ({ children }) => (
      <Provider>
        <VisualizationProvider controller={hostController}>{children}</VisualizationProvider>
      </Provider>
    );

    const controller = ControllerService.createController();
    fromModelSpy = vi.spyOn(controller, 'fromModel');
    createControllerSpy = vi.spyOn(ControllerService, 'createController').mockReturnValue(controller);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    /* Restore the global spies before the real timers come back */
    vi.restoreAllMocks();
    vi.useRealTimers();

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('renders the hidden canvas container', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    const { container } = render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, {
      wrapper: Wrapper,
    });

    expect(container.querySelector('.hidden-canvas')).toBeInTheDocument();
  });

  it('creates a controller on mount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    // Called once on render, the controller is kept across re-renders
    expect(createControllerSpy).toHaveBeenCalledTimes(1);
  });

  it('builds the graph model from viz nodes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    expect(fromModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        graph: expect.objectContaining({
          id: 'g1',
          type: 'graph',
        }),
      }),
      expect.anything(),
    );
  });

  it('keeps node IDs and group children distinct when exporting multiple routes', async () => {
    const first = await new CamelRouteVisualEntity({
      route: { id: 'first', from: { uri: 'timer', steps: [{ log: { message: 'one' } }] } },
    }).toVizNode();
    const second = await new CamelRouteVisualEntity({
      route: { id: 'second', from: { uri: 'timer', steps: [{ log: { message: 'two' } }] } },
    }).toVizNode();
    render(<HiddenCanvas vizNodes={[first, second]} onComplete={mockOnComplete} />, { wrapper: Wrapper });
    const model = fromModelSpy.mock.calls[0][0];
    const ids = model.nodes.map((node: { id: string }) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const scope of ['first', 'second']) {
      const group = model.nodes.find((node: { id: string }) => node.id === `${scope}|route`);
      expect(group).toBeDefined();
      expect(group.children.length).toBeGreaterThan(0);
      expect(group.children.every((id: string) => id.startsWith(`${scope}|`))).toBe(true);
    }
  });

  it('resets and layouts the graph after model is loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
  });

  it('triggers export when GRAPH_LAYOUT_END_EVENT fires', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });
  });

  it('calls toBlob with correct options', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalledWith(expect.any(HTMLElement), {
        cacheBust: true,
        filter: expect.any(Function),
        pixelRatio: 2,
        skipAutoScale: true,
      });
    });
  });

  it('calls onComplete after successful export', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('revokes blob URL after download when autoDownload is true', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL');
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    await waitFor(() => {
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  it('triggers fallback timer if layout does not complete', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    // Don't trigger the GRAPH_LAYOUT_END_EVENT
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });
  });

  it('handles missing surface element gracefully', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<HiddenCanvas vizNodes={[]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles toBlob returning null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(toBlob).mockResolvedValue(null);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to generate blob');
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles export error and calls onComplete', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Export failed');
    vi.mocked(toBlob).mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Export failed', error);
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('uses custom layout type when provided', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} layout={LayoutType.DagreVertical} onComplete={mockOnComplete} />, {
      wrapper: Wrapper,
    });

    expect(fromModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        graph: expect.objectContaining({
          layout: LayoutType.DagreVertical,
        }),
      }),
      false,
    );
  });

  it('clears fallback timer on unmount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const vizNode = await entity.toVizNode();

    const { unmount } = render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, {
      wrapper: Wrapper,
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('calls onBlobGenerated callback with the generated blob', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
    vi.mocked(toBlob).mockResolvedValue(mockBlob);
    const mockOnBlobGenerated = vi.fn();

    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} onBlobGenerated={mockOnBlobGenerated} />, {
      wrapper: Wrapper,
    });

    await act(async () => {
      fireLayoutEnd();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(mockOnBlobGenerated).toHaveBeenCalledWith(mockBlob);
    });
  });

  it('does not auto-download when autoDownload is false', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload={false} />, {
      wrapper: Wrapper,
    });

    await act(async () => {
      fireLayoutEnd();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('auto-downloads when autoDownload is true', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload />, { wrapper: Wrapper });

    await act(async () => {
      fireLayoutEnd();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
