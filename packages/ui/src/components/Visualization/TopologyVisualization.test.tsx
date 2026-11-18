import { VisualizationProvider } from '@patternfly/react-topology';
import { render, screen, waitFor } from '@testing-library/react';

import { CamelRouteVisualEntity } from '../../models/visualization/flows';
import { TestProvidersWrapper, TestRuntimeProviderWrapper } from '../../stubs';
import { camelRouteJson } from '../../stubs/camel-route';
import { ControllerService } from './Canvas/controller.service';
import { TopologyVisualization } from './TopologyVisualization';

describe('TopologyVisualization', () => {
  const renderTopology = async (entities: CamelRouteVisualEntity[]) => {
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const { Provider } = await TestProvidersWrapper();

    return render(
      <RuntimeProvider>
        <Provider>
          <VisualizationProvider controller={ControllerService.createController()}>
            <TopologyVisualization entities={entities} />
          </VisualizationProvider>
        </Provider>
      </RuntimeProvider>,
    );
  };

  it('shows the empty state over a mounted canvas when there are no entities', async () => {
    await renderTopology([]);

    expect(await screen.findByTestId('visualization-empty-state')).toHaveTextContent('There are no routes defined');
    expect(screen.getByLabelText('Route canvas')).toBeInTheDocument();
  });

  it('draws the entities and removes the empty state', async () => {
    const { container } = await renderTopology([new CamelRouteVisualEntity(camelRouteJson)]);

    await waitFor(() => {
      expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Route canvas')).toBeInTheDocument();
  });
});
