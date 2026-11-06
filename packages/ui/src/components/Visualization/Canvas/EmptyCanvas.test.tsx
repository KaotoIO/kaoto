import { VisualizationProvider } from '@patternfly/react-topology';
import { fireEvent, render, RenderResult, screen, waitFor } from '@testing-library/react';

import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../../stubs';
import { ControllerService } from './controller.service';
import { EmptyCanvas } from './EmptyCanvas';

describe('EmptyCanvas', () => {
  it('should render empty state when there are no routes', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();

    const result: RenderResult | undefined = render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <EmptyCanvas entitiesNumber={0} />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );

    await waitFor(async () => {
      expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument();
    });
    expect(result?.asFragment()).toMatchSnapshot();
  });

  it('should render empty state when there are routes but none are visible', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();

    const result: RenderResult | undefined = render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <EmptyCanvas entitiesNumber={1} />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );

    await waitFor(async () => {
      expect(screen.getByTestId('visualization-empty-state')).toBeInTheDocument();
    });
    expect(result?.container).toMatchSnapshot();
  });

  it('should not render empty state while viz nodes are still resolving', async () => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();

    render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <EmptyCanvas entitiesNumber={1} isModelResolving />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );

    expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
  });
  it.each(['F10', 'ContextMenu'])(
    'opens the context menu with %s after the empty view finishes resolving',
    async (key) => {
      const { Provider } = await TestProvidersWrapper();
      const controller = ControllerService.createController();
      const view = (isModelResolving: boolean) => (
        <Provider>
          <VisualizationProvider controller={controller}>
            <EmptyCanvas entitiesNumber={1} isModelResolving={isModelResolving} />
          </VisualizationProvider>
        </Provider>
      );
      const { rerender } = render(view(true));
      rerender(view(false));
      const canvas = screen.getByLabelText('Route canvas');
      canvas.focus();
      expect(fireEvent.keyDown(canvas, { key, shiftKey: key === 'F10' })).toBe(false);
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'Show all' })).toHaveFocus());
    },
  );

  it('opens the same canvas actions with the mouse on the empty view', async () => {
    const { Provider } = await TestProvidersWrapper();
    render(
      <Provider>
        <EmptyCanvas entitiesNumber={1} />
      </Provider>,
    );
    expect(fireEvent.contextMenu(screen.getByText('There are no visible routes'), { clientX: 200, clientY: 100 })).toBe(
      false,
    );
    expect(await screen.findByRole('menuitem', { name: 'Show all' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hide all' })).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});
