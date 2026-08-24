import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CamelYamlDsl, CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CanvasFormTabsProvider } from '@kaoto/forms';
import { fireEvent, render } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { parse } from 'yaml';

import { DynamicCatalog } from '../../../dynamic-catalog/dynamic-catalog';
import { DynamicCatalogRegistry } from '../../../dynamic-catalog/dynamic-catalog-registry';
import { StarterTemplatesProvider } from '../../../dynamic-catalog/providers/starter-templates.provider';
import { CamelRouteResource } from '../../../models/camel';
import { CatalogKind } from '../../../models/catalog-kind';
import { EntityType } from '../../../models/entities';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { mockRandomValues } from '../../../stubs';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { TestProvidersWrapper } from '../../../stubs/TestProvidersWrapper';
import { CanvasSideBar } from './CanvasSideBar';
import { FlowService } from './flow.service';

describe('CanvasSideBar', () => {
  let selectedVizNode: IVisualizationNode;
  let Provider: FunctionComponent<PropsWithChildren>;

  beforeAll(async () => {
    // Seed the StarterTemplate catalog before initialize() is called.
    // The global beforeEach runs AFTER beforeAll, so we must seed explicitly here.
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    DynamicCatalogRegistry.get().setCatalog(
      CatalogKind.StarterTemplate,
      new DynamicCatalog(new StarterTemplatesProvider(catalogsMap.starterTemplates)),
    );

    mockRandomValues();
    const baseResource = new CamelRouteResource();
    await baseResource.initialize();
    baseResource.addNewEntity(EntityType.Route);
    // Materialize the route into source so the wrapper's re-initialize() reproduces
    // it — mirrors how runtime recreates the resource from serialized code.
    const camelResource = new CamelRouteResource(parse(await baseResource.toSourceCode()) as CamelYamlDsl);
    await camelResource.initialize();
    const visualEntity = camelResource.getVisualEntities()[0];
    const node = FlowService.getFlowDiagram('test', await visualEntity.toVizNode()).nodes[0];
    selectedVizNode = node.data!.vizNode!;
    Provider = (await TestProvidersWrapper({ camelResource })).Provider;
  });

  it('does not render anything if there is no selectedVizNode', async () => {
    const wrapper = render(
      <CanvasFormTabsProvider>
        <CanvasSideBar vizNode={undefined} onClose={() => {}} />
      </CanvasFormTabsProvider>,
    );

    expect(wrapper.container).toBeEmptyDOMElement();
  });

  it('displays selected node information', async () => {
    const wrapper = render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasSideBar vizNode={selectedVizNode} onClose={() => {}} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    expect(wrapper.asFragment()).toMatchSnapshot();
  });

  it('should propagate onClose callback', async () => {
    const onCloseSpy = vi.fn();

    const wrapper = render(
      <Provider>
        <CanvasFormTabsProvider>
          <CanvasSideBar vizNode={selectedVizNode} onClose={onCloseSpy} />
        </CanvasFormTabsProvider>
      </Provider>,
    );

    const closeButton = wrapper.getByTestId('close-side-bar');
    fireEvent.click(closeButton);

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });
});
