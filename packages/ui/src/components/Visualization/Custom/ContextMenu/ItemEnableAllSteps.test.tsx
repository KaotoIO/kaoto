import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { Model, VisualizationProvider } from '@patternfly/react-topology';
import { act, fireEvent, render, waitFor } from '@testing-library/react';

import { CamelCatalogService, CatalogKind } from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel/camel-route-resource';
import { camelRouteJson, camelRouteWithDisabledSteps } from '../../../../stubs/camel-route';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { TestProvidersWrapper } from '../../../../stubs/TestProvidersWrapper';
import { getVisualizationNodesFromGraph } from '../../../../utils';
import { ControllerService } from '../../Canvas/controller.service';
import { FlowService } from '../../Canvas/flow.service';
import { ItemEnableAllSteps } from './ItemEnableAllSteps';

describe('ItemEnableAllSteps', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);
  });

  it('should NOT render an ItemEnableAllSteps if there are not at least 2 or more disabled steps', () => {
    const camelResource = new CamelRouteResource([camelRouteJson]);
    const visualEntity = camelResource.getVisualEntities()[0];
    const { nodes, edges } = FlowService.getFlowDiagram('test', visualEntity.toVizNode());

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
      },
    };
    const visualizationController = ControllerService.createController();
    visualizationController.fromModel(model);

    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <VisualizationProvider controller={visualizationController}>
          <ItemEnableAllSteps data-testid="context-menu-item-enable-all" />
        </VisualizationProvider>
      </Provider>,
    );

    const item = wrapper.queryByTestId('context-menu-item-enable-all');

    expect(item).not.toBeInTheDocument();
  });

  it('should call updateModel and updateEntitiesFromCamelResource on click', async () => {
    const camelResource = new CamelRouteResource([camelRouteWithDisabledSteps]);
    const visualEntity = camelResource.getVisualEntities()[0];
    const { nodes, edges } = FlowService.getFlowDiagram('test', visualEntity.toVizNode());

    const model: Model = {
      nodes,
      edges,
      graph: {
        id: 'g1',
        type: 'graph',
      },
    };
    const visualizationController = ControllerService.createController();
    visualizationController.fromModel(model);
    const disabledNodes = getVisualizationNodesFromGraph(visualizationController.getGraph(), (node) => {
      return node.getNodeDefinition()?.disabled;
    });

    const { Provider, updateEntitiesFromCamelResourceSpy } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <VisualizationProvider controller={visualizationController}>
          <ItemEnableAllSteps />
        </VisualizationProvider>
      </Provider>,
    );

    act(() => {
      const item = wrapper.getByText('Enable All');
      fireEvent.click(item);
    });

    await waitFor(async () => {
      disabledNodes.forEach((node) => {
        expect(node.getNodeDefinition()?.disabled).toBe(false);
      });
    });

    await waitFor(async () => {
      expect(updateEntitiesFromCamelResourceSpy).toHaveBeenCalledTimes(1);
    });
  });
});
