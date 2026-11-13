import { VisualizationProvider } from '@patternfly/react-topology';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext } from 'react';

import { CamelRouteResource } from '../../models/camel';
import { EntitiesContext, EntitiesProvider, KaotoResourceContext, VisibleFlowsProvider } from '../../providers';
import { TestRuntimeProviderWrapper } from '../../stubs';
import { ControllerService } from './Canvas/controller.service';
import { TopologyVisualization } from './TopologyVisualization';

describe('TopologyVisualization', () => {
  it('keeps the same canvas when the first entity appears', async () => {
    const user = userEvent.setup();
    const controller = ControllerService.createController();
    // jsdom has no viewport dimensions; keep the real node renderers mounted
    controller.setRenderConstraint(false);
    const RuntimeProvider = TestRuntimeProviderWrapper().Provider;
    const kaotoResourceContext = { kaotoResource: new CamelRouteResource([]) };
    const TopologyView = () => <TopologyVisualization entities={useContext(EntitiesContext)!.visualEntities} />;

    const { container } = render(
      <RuntimeProvider>
        <KaotoResourceContext.Provider value={kaotoResourceContext}>
          <EntitiesProvider>
            <VisibleFlowsProvider>
              <VisualizationProvider controller={controller}>
                <TopologyView />
              </VisualizationProvider>
            </VisibleFlowsProvider>
          </EntitiesProvider>
        </KaotoResourceContext.Provider>
      </RuntimeProvider>,
    );
    // Let the entities provider finish initializing the resource, so the rendered view is settled
    await act(() => new Promise((resolve) => setTimeout(resolve)));
    const canvas = container.querySelector('#canvas-main');
    expect(canvas).toBeInTheDocument();

    /* The "New" button of the empty state adds the first route */
    await user.click(await screen.findByTestId('dsl-list-btn'));

    await waitFor(() => {
      expect(container.querySelector('[data-kind="node"]')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('visualization-empty-state')).not.toBeInTheDocument();
    expect(container.querySelector('#canvas-main')).toBe(canvas);
  });
});
