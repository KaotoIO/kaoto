import { GRAPH_LAYOUT_END_EVENT, useEventListener } from '@patternfly/react-topology';
import { act, render, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import type { Mock, MockInstance } from 'vitest';

import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { TestProvidersWrapper } from '../../../../stubs';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { HiddenCanvas } from './HiddenCanvas';

vi.mock('html-to-image', async () => ({
  toBlob: vi.fn(),
}));
vi.mock('@patternfly/react-topology', async () => ({
  ...(await vi.importActual('@patternfly/react-topology')),
  useEventListener: vi.fn(),
}));

describe('HiddenCanvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);

  let mockOnComplete: Mock;
  let eventListenerCallback: ((event?: Event) => void) | null = null;
  let fromModelSpy: MockInstance;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalRAF: typeof globalThis.requestAnimationFrame;
  let originalCAF: typeof globalThis.cancelAnimationFrame;
  let originalCT: typeof globalThis.clearTimeout;
  let clickSpy: MockInstance;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Save original implementations
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;
    originalCT = globalThis.clearTimeout;

    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    // Mock requestAnimationFrame to execute synchronously
    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as unknown as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn();
    globalThis.clearTimeout = vi.fn();

    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mockOnComplete = vi.fn();

    (toBlob as Mock).mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' }));

    const controller = ControllerService.createController();
    fromModelSpy = vi.spyOn(controller, 'fromModel');
    vi.spyOn(ControllerService, 'createController').mockReturnValue(controller);

    (useEventListener as Mock).mockImplementation((eventType: string, callback: (event?: Event) => void) => {
      if (eventType === GRAPH_LAYOUT_END_EVENT) {
        eventListenerCallback = callback;
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
    eventListenerCallback = null;

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    globalThis.clearTimeout = originalCT;
    clickSpy.mockRestore();
  });

  it('renders the hidden canvas container', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    const { container } = render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, {
      wrapper: Provider,
    });

    expect(container.querySelector('.hidden-canvas')).toBeInTheDocument();
  });

  it('creates a controller on mount', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    // Called once in beforeEach and once in render
    expect(ControllerService.createController).toHaveBeenCalledTimes(2);
  });

  it('builds the graph model from viz nodes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

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

  it('resets and layouts the graph after model is loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
  });

  it('triggers export when GRAPH_LAYOUT_END_EVENT fires', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });
  });

  it('calls toBlob with correct options', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await vi.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalledWith(expect.any(HTMLElement), {
        cacheBust: true,
        filter: expect.any(Function),
        pixelRatio: 2,
        skipFonts: true,
        skipAutoScale: true,
      });
    });
  });

  it('calls onComplete after successful export', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      if (eventListenerCallback) {
        eventListenerCallback();
      }
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

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
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
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

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

    const { Provider } = TestProvidersWrapper();

    render(<HiddenCanvas vizNodes={[]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles toBlob returning null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    (toBlob as Mock).mockResolvedValue(null);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      if (eventListenerCallback) {
        eventListenerCallback();
      }
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
    (toBlob as Mock).mockRejectedValue(error);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
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
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} layout={LayoutType.DagreVertical} onComplete={mockOnComplete} />, {
      wrapper: Provider,
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

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    const { unmount } = render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, {
      wrapper: Provider,
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('calls onBlobGenerated callback with the generated blob', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
    (toBlob as Mock).mockResolvedValue(mockBlob);
    const mockOnBlobGenerated = vi.fn();

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} onBlobGenerated={mockOnBlobGenerated} />, {
      wrapper: Provider,
    });

    await act(async () => {
      eventListenerCallback?.();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(mockOnBlobGenerated).toHaveBeenCalledWith(mockBlob);
    });
  });

  it('does not auto-download when autoDownload is false', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload={false} />, {
      wrapper: Provider,
    });

    await act(async () => {
      eventListenerCallback?.();
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
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await vi.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
