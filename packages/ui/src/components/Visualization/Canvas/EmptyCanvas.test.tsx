import { VisualizationProvider } from '@patternfly/react-topology';
import { render, RenderResult, screen, waitFor } from '@testing-library/react';

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
});
