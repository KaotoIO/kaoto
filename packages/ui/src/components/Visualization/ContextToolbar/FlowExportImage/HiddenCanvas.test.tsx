import { GRAPH_LAYOUT_END_EVENT, useEventListener } from '@patternfly/react-topology';
import { act, render, waitFor } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import { PropsWithChildren } from 'react';

import { BaseVisualCamelEntity } from '../../../../models/visualization/base-visual-entity';
import { EntitiesProvider } from '../../../../providers/entities.provider';
import { SourceCodeProvider } from '../../../../providers/source-code.provider';
import { VisibleFlowsProvider } from '../../../../providers/visible-flows.provider';
import { CanvasNode, LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { FlowService } from '../../Canvas/flow.service';
import { HiddenCanvas } from './HiddenCanvas';

jest.mock('html-to-image', () => ({
  toBlob: jest.fn(),
}));

jest.mock('@patternfly/react-topology', () => ({
  ...jest.requireActual('@patternfly/react-topology'),
  useEventListener: jest.fn(),
}));

jest.mock('../../Canvas/flow.service');

describe('HiddenCanvas', () => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <SourceCodeProvider>
      <EntitiesProvider>
        <VisibleFlowsProvider>{children}</VisibleFlowsProvider>
      </EntitiesProvider>
    </SourceCodeProvider>
  );

  let mockOnComplete: jest.Mock;
  let mockEntity: BaseVisualCamelEntity;
  let eventListenerCallback: ((event?: Event) => void) | null = null;
  let fromModelSpy: jest.SpyInstance;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let originalRAF: typeof globalThis.requestAnimationFrame;
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();

    // Save original implementations
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    originalRAF = globalThis.requestAnimationFrame;

    URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = jest.fn();

    // Mock requestAnimationFrame to execute synchronously
    globalThis.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as unknown as typeof globalThis.requestAnimationFrame;

    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation();
    mockOnComplete = jest.fn();

    mockEntity = {
      id: 'test-entity-1',
      toVizNode: jest.fn(() => ({ id: 'node-1', data: {} })),
    } as unknown as BaseVisualCamelEntity;

    (FlowService.getFlowDiagram as jest.Mock).mockReturnValue({
      nodes: [{ id: 'node-1', type: 'node' } as CanvasNode],
      edges: [{ id: 'edge-1', type: 'edge' }],
    });

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
    clickSpy.mockRestore();
  });

  it('renders the hidden canvas container', () => {
    const { container } = render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    expect(container.querySelector('.hidden-canvas')).toBeInTheDocument();
  });

  it('creates a controller on mount', () => {
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    // Called once in beforeEach and once in render
    expect(ControllerService.createController).toHaveBeenCalledTimes(2);
  });

  it('builds the graph model from entities', () => {
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

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

  it('resets and layouts the graph after model is loaded', () => {
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
  });

  it('triggers export when GRAPH_LAYOUT_END_EVENT fires', async () => {
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    act(() => {
      // Simulate the GRAPH_LAYOUT_END_EVENT
      eventListenerCallback?.();
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });
  });

  it('calls toBlob with correct options', async () => {
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    act(() => {
      eventListenerCallback?.();
      jest.runAllTimers();
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
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    act(() => {
      if (eventListenerCallback) {
        eventListenerCallback();
      }
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('revokes blob URL after download', async () => {
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    act(() => {
      eventListenerCallback?.();
      // Advance time just enough to trigger the layout
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    act(() => {
      // Fast-forward the cleanup timer (100ms)
      jest.advanceTimersByTime(150);
    });

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('triggers fallback timer if layout does not complete', async () => {
    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    // Don't trigger the GRAPH_LAYOUT_END_EVENT
    // Fast-forward past the fallback timer
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(toBlob).toHaveBeenCalled();
    });
  });

  it('handles missing surface element gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<HiddenCanvas entities={[]} onComplete={mockOnComplete} />, { wrapper });

    act(() => {
      eventListenerCallback?.();
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles toBlob returning null', async () => {
    (toBlob as jest.Mock).mockResolvedValue(null);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    act(() => {
      if (eventListenerCallback) {
        eventListenerCallback();
      }
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to generate blob');
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles export error and calls onComplete', async () => {
    const error = new Error('Export failed');
    (toBlob as jest.Mock).mockRejectedValue(error);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    act(() => {
      eventListenerCallback?.();
      jest.advanceTimersByTime(0);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Export failed', error);
      expect(mockOnComplete).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('uses custom layout type when provided', () => {
    render(<HiddenCanvas entities={[mockEntity]} layout={LayoutType.DagreVertical} onComplete={mockOnComplete} />, {
      wrapper,
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

  it('clears fallback timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

    const { unmount } = render(<HiddenCanvas entities={[mockEntity]} onComplete={mockOnComplete} />, { wrapper });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
