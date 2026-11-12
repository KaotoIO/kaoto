import { VisualizationProvider } from '@patternfly/react-topology';
import { render, RenderResult, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
    const canvas = screen.getByRole('region', { name: 'Route canvas' });
    canvas.focus();
    expect(canvas).toHaveFocus();
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
});

it.each(['{ContextMenu}', '{Shift>}{F10}{/Shift}'])(
  'opens the empty canvas actions using %s while leaving toolbar keys alone',
  async (keys) => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();
    render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <EmptyCanvas entitiesNumber={0} contextToolbar={<button>Toolbar action</button>} />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );
    const user = userEvent.setup();
    screen.getByText('Toolbar action').focus();
    await user.keyboard(keys);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    screen.getByRole('region', { name: 'Route canvas' }).focus();
    await user.keyboard(keys);
    expect(await screen.findByRole('menuitem', { name: 'Show all' })).toHaveFocus();
    expect(screen.getByRole('menuitem', { name: 'New' })).toHaveAttribute('aria-haspopup', 'menu');
  },
);
