import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { SourcePanel } from './SourcePanel';

// Mock ResizeObserver and RAF are already handled globally in vitest-setup.ts

describe('SourcePanel', () => {
  it('should render action buttons by default', () => {
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <SourcePanel />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(screen.getByTestId('add-parameter-button')).toBeInTheDocument();
    expect(screen.getByTestId('attach-schema-sourceBody-Body-button')).toBeInTheDocument();
    expect(screen.getByTestId('detach-schema-sourceBody-Body-button')).toBeInTheDocument();
  });
  it('should not render action buttons if isReadOnly=true', () => {
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <SourcePanel isReadOnly />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );
    expect(screen.queryByTestId('add-parameter-button')).toBeFalsy();
    expect(screen.queryByTestId('attach-schema-sourceBody-Body-button')).toBeFalsy();
    expect(screen.queryByTestId('detach-schema-sourceBody-Body-button')).toBeFalsy();
  });

  it('should trigger handleLayoutChange when panel is toggled', async () => {
    vi.useFakeTimers();

    // Ensure RAF is accessible in fake timer context - execute callbacks synchronously for tests
    // Store original RAF to restore later
    const originalRAF = globalThis.requestAnimationFrame;

    // Create RAF mock that executes immediately and is accessible globally
    const rafCallbacks: Array<FrameRequestCallback> = [];
    const rafMock = (cb: FrameRequestCallback): number => {
      rafCallbacks.push(cb);
      // Execute in next microtask to avoid immediate nested execution issues
      queueMicrotask(() => {
        const callback = rafCallbacks.shift();
        if (callback) callback(Date.now());
      });
      return rafCallbacks.length;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = rafMock;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).requestAnimationFrame = rafMock;

    const { unmount } = render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <SourcePanel />
        </MappingLinksProvider>
      </DataMapperProvider>,
    );

    // Find the Body panel summary and click to collapse
    const bodyPanel = screen.getByText('Source Body').closest('.expansion-panel__summary') as HTMLElement;
    expect(bodyPanel).toBeInTheDocument();

    await act(async () => {
      bodyPanel.click();
      // Advance timers to trigger onLayoutChange (160ms delay)
      // Also run all pending timers including RAF callbacks
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();
      // Wait for any queued RAF callbacks
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
    });

    // The panel should now be collapsed (data-expanded=false)
    const panel = screen.getByText('Source Body').closest('.expansion-panel');
    expect(panel).toHaveAttribute('data-expanded', 'false');

    // Clean up
    unmount();
    await new Promise((resolve) => queueMicrotask(() => resolve(undefined))); // Wait for cleanup RAF calls

    // Restore original RAF
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).requestAnimationFrame = originalRAF;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).requestAnimationFrame = originalRAF;
    vi.useRealTimers();
  });
});
