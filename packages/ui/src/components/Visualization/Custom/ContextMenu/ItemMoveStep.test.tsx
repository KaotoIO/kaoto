import { AngleDoubleDownIcon, AngleDoubleUpIcon } from '@patternfly/react-icons';
import { VisualizationProvider } from '@patternfly/react-topology';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { cloneDeep } from 'lodash';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { AddStepMode, IVisualizationNode } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { camelRouteJson, TestProvidersWrapper } from '../../../../stubs';
import { createRouteVisualizationController } from '../../../../stubs/route-visualization-controller';
import { ItemMoveStep } from './ItemMoveStep';

describe('ItemMoveStep', () => {
  let camelResource: CamelRouteResource;
  /** The first step of the route, followed by the `choice` step: it can be moved next */
  let vizNode: IVisualizationNode;
  /** The last step of the route, only followed by a placeholder: it can't be moved next */
  let lastVizNode: IVisualizationNode;
  let updateEntitiesFromCamelResourceSpy: Mock;
  let wrapper: FunctionComponent<PropsWithChildren>;

  beforeEach(async () => {
    camelResource = new CamelRouteResource([cloneDeep(camelRouteJson)]);
    const { Provider, updateEntitiesFromCamelResourceSpy: updateSpy } = await TestProvidersWrapper({ camelResource });
    updateEntitiesFromCamelResourceSpy = updateSpy;

    const { controller, getVizNode } = await createRouteVisualizationController(camelResource);
    vizNode = getVizNode('route.from.steps.0.set-header');
    lastVizNode = getVizNode('route.from.steps.2.to');

    wrapper = ({ children }) => (
      <Provider>
        <VisualizationProvider controller={controller}>{children}</VisualizationProvider>
      </Provider>
    );
  });

  it('should render Move Next ContextMenuItem', () => {
    const { container } = render(
      <ItemMoveStep vizNode={vizNode} mode={AddStepMode.AppendStep}>
        <AngleDoubleDownIcon /> Move Next
      </ItemMoveStep>,
      { wrapper },
    );

    expect(container).toMatchSnapshot();
  });

  it('should not render Move Before ContextMenuItem', () => {
    const { container } = render(
      <ItemMoveStep vizNode={lastVizNode} mode={AddStepMode.AppendStep}>
        <AngleDoubleUpIcon /> Move Before
      </ItemMoveStep>,
      { wrapper },
    );

    expect(container).toMatchSnapshot();
  });

  it('should call onMoveStep when the context menu item is clicked', async () => {
    const wrapperResult = render(
      <ItemMoveStep vizNode={vizNode} mode={AddStepMode.AppendStep}>
        <AngleDoubleDownIcon /> Move Next
      </ItemMoveStep>,
      { wrapper },
    );
    fireEvent.click(wrapperResult.getByText('Move Next'));

    /* The real `useMoveStep` swaps the step with the next one and refreshes the entities */
    await waitFor(() => {
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
    });
    const steps = camelResource.getVisualEntities()[0].toJSON().route.from.steps;
    expect(Object.keys(steps[0])).toEqual(['choice']);
    expect(Object.keys(steps[1])).toEqual(['set-header']);
  });
});
