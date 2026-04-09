import { GRAPH_LAYOUT_END_EVENT, useEventListener } from '@patternfly/react-topology';
import { act, render, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';

import { CamelRouteVisualEntity } from '../../../../models/visualization/flows';
import { TestProvidersWrapper } from '../../../../stubs';
import { camelRouteJson } from '../../../../stubs/camel-route';
import { LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { HiddenCanvas } from './HiddenCanvas';

jest.mock('html-to-image', () => ({
  toBlob: jest.fn(),
}));

jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  useEventListener: jest.fn(),
}));

describe('HiddenCanvas', () => {
  const entity = new CamelRouteVisualEntity(camelRouteJson);

  let mockOnComplete: jest.Mock;
  let eventListenerCallback: ((event?: Event) => void) | null = null;
  let fromModelSpy: jest.SpyInstance;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalRAF: typeof globalThis.requestAnimationFrame;
  let originalCAF: typeof globalThis.cancelAnimationFrame;
  let originalCT: typeof globalThis.clearTimeout;
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();

    // Save original implementations
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalRAF = globalThis.requestAnimationFrame;
    originalCAF = globalThis.cancelAnimationFrame;
    originalCT = globalThis.clearTimeout;

    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();

    // Mock requestAnimationFrame to execute synchronously
    globalThis.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as unknown as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = jest.fn();
    globalThis.clearTimeout = jest.fn();

    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation();
    mockOnComplete = jest.fn();

    (toBlob as jest.Mock).mockResolvedValue(new Blob(['fake-image-data'], { type: 'image/png' }));

    const controller = ControllerService.createController();
    fromModelSpy = jest.spyOn(controller, 'fromModel');
    jest.spyOn(ControllerService, 'createController').mockReturnValue(controller);

    (useEventListener as jest.Mock).mockImplementation((eventType: string, callback: (event?: Event) => void) => {
      if (eventType === GRAPH_LAYOUT_END_EVENT) {
        eventListenerCallback = callback;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    eventListenerCallback = null;

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    globalThis.requestAnimationFrame = originalRAF;
    globalThis.cancelAnimationFrame = originalCAF;
    globalThis.clearTimeout = originalCT;
    clickSpy.mockRestore();
  });

  it('renders the hidden canvas container', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    const { container } = render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, {
      wrapper: Provider,
    });

    expect(container.querySelector('.hidden-canvas')).toBeInTheDocument();
  });

  it('creates a controller on mount', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    // Called once in beforeEach and once in render
    expect(ControllerService.createController).toHaveBeenCalledTimes(2);
  });

  it('builds the graph model from viz nodes', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
  });

  it('triggers export when GRAPH_LAYOUT_END_EVENT fires', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });
  });

  it('calls toBlob with correct options', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await jest.runAllTimersAsync();
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      if (eventListenerCallback) {
        eventListenerCallback();
      }
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('revokes blob URL after download when autoDownload is true', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const createObjectURLSpy = jest.spyOn(URL, 'createObjectURL');
    const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await jest.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    await act(async () => {
      await jest.advanceTimersByTimeAsync(150);
    });

    await waitFor(() => {
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  it('triggers fallback timer if layout does not complete', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    // Don't trigger the GRAPH_LAYOUT_END_EVENT
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });
  });

  it('handles missing surface element gracefully', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { Provider } = TestProvidersWrapper();

    render(<HiddenCanvas vizNodes={[]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await jest.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles toBlob returning null', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (toBlob as jest.Mock).mockResolvedValue(null);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      if (eventListenerCallback) {
        eventListenerCallback();
      }
      await jest.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to generate blob');
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles export error and calls onComplete', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Export failed');
    (toBlob as jest.Mock).mockRejectedValue(error);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await jest.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Export failed', error);
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('uses custom layout type when provided', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    const { unmount } = render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} />, {
      wrapper: Provider,
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('calls onBlobGenerated callback with the generated blob', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
    (toBlob as jest.Mock).mockResolvedValue(mockBlob);
    const mockOnBlobGenerated = jest.fn();

    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} onBlobGenerated={mockOnBlobGenerated} />, {
      wrapper: Provider,
    });

    await act(async () => {
      eventListenerCallback?.();
      await jest.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(mockOnBlobGenerated).toHaveBeenCalledWith(mockBlob);
    });
  });

  it('does not auto-download when autoDownload is false', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload={false} />, {
      wrapper: Provider,
    });

    await act(async () => {
      eventListenerCallback?.();
      await jest.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('auto-downloads when autoDownload is true', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { Provider } = TestProvidersWrapper();
    const vizNode = await entity.toVizNode();

    render(<HiddenCanvas vizNodes={[vizNode]} onComplete={mockOnComplete} autoDownload />, { wrapper: Provider });

    await act(async () => {
      eventListenerCallback?.();
      await jest.advanceTimersByTimeAsync(0);
    });

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
