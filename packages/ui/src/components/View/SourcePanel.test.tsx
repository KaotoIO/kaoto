import { act, render, screen, waitFor } from '@testing-library/react';

import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../providers/datamapper-canvas.provider';
import { SourcePanel } from './SourcePanel';

// Mock ResizeObserver for ExpansionPanels
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      // intentional noop for test mock
    }
    unobserve() {
      // intentional noop for test mock
    }
    disconnect() {
      // intentional noop for test mock
    }
  };
});

describe('SourcePanel', () => {
  it('should render action buttons by default', () => {
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourcePanel />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(screen.getByTestId('add-parameter-button')).toBeInTheDocument();
    expect(screen.getByTestId('attach-schema-sourceBody-Body-button')).toBeInTheDocument();
    expect(screen.getByTestId('detach-schema-sourceBody-Body-button')).toBeInTheDocument();
  });
  it('should not render action buttons if isReadOnly=true', () => {
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourcePanel isReadOnly />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    expect(screen.queryByTestId('add-parameter-button')).toBeFalsy();
    expect(screen.queryByTestId('attach-schema-sourceBody-Body-button')).toBeFalsy();
    expect(screen.queryByTestId('detach-schema-sourceBody-Body-button')).toBeFalsy();
  });

  it('should trigger handleLayoutChange when panel is toggled', async () => {
    jest.useFakeTimers();
    render(
      <DataMapperProvider>
        <DataMapperCanvasProvider>
          <SourcePanel />
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );

    // Find the Body panel summary and click to collapse
    const bodyPanel = screen.getByText('Body').closest('.expansion-panel__summary') as HTMLElement;
    expect(bodyPanel).toBeInTheDocument();

    act(() => {
      bodyPanel.click();
    });

    // Advance timers to trigger onLayoutChange (160ms delay)
    await act(async () => {
      jest.advanceTimersByTime(200);
    });

    // The panel should now be collapsed (data-expanded=false)
    await waitFor(() => {
      const panel = screen.getByText('Body').closest('.expansion-panel');
      expect(panel).toHaveAttribute('data-expanded', 'false');
    });

    jest.useRealTimers();
  });
});
