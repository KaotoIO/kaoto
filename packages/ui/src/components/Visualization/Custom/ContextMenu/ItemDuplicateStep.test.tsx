import { Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { IVisualizationNode } from '../../../../models/visualization/base-visual-entity';
import { camelRouteJson, TestProvidersWrapper } from '../../../../stubs';
import { createRouteVisualizationController } from '../../../../stubs/route-visualization-controller';
import { ItemDuplicateStep } from './ItemDuplicateStep';

describe('ItemDuplicateStep', () => {
  let camelResource: CamelRouteResource;
  let controller: Visualization;
  /** The route node: a root container of a Camel Route, which can always be duplicated */
  let routeVizNode: IVisualizationNode;
  /** A step node: without a catalog to check its compatibility, it can't be duplicated */
  let stepVizNode: IVisualizationNode;
  let updateEntitiesFromCamelResourceSpy: Mock;
  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(async () => {
    camelResource = new CamelRouteResource([cloneDeep(camelRouteJson)]);
    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = await TestProvidersWrapper({ camelResource });
    updateEntitiesFromCamelResourceSpy = updateSpy;

    const routeVisualization = await createRouteVisualizationController(camelResource);
    controller = routeVisualization.controller;
    routeVizNode = routeVisualization.rootVizNode;
    stepVizNode = routeVisualization.getVizNode('route.from.steps.0.set-header');

    wrapper = ({ children }) => (
      <Provider>
        <VisualizationProvider controller={controller}>{children}</VisualizationProvider>
      </Provider>
    );
  });

  it('should render Duplicate ContextMenuItem', () => {
    const { container } = render(<ItemDuplicateStep vizNode={routeVizNode}>Duplicate</ItemDuplicateStep>, {
      wrapper,
    });

    expect(container).toMatchSnapshot();
  });

  it('should not render Paste ContextMenuItem', () => {
    const { container } = render(<ItemDuplicateStep vizNode={stepVizNode}>Duplicate</ItemDuplicateStep>, {
      wrapper,
    });

    expect(container).toMatchSnapshot();
  });

  it('should call onDuplicate when the context menu item is clicked', async () => {
    const wrapperResult = render(<ItemDuplicateStep vizNode={routeVizNode}>Duplicate</ItemDuplicateStep>, {
      wrapper,
    });
    fireEvent.click(wrapperResult.getByText('Duplicate'));

    /* The real `useDuplicateStep` adds a copy of the route and refreshes the entities */
    await waitFor(() => {
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
    });
    expect(camelResource.getVisualEntities()).toHaveLength(2);
  });
});
