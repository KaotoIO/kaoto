import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { ElementModel, GraphElement, Model, VisualizationProvider } from '@patternfly/react-topology';
import { render } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import {
  CamelCatalogService,
  CatalogKind,
  createVisualizationNode,
  IVisualizationNode,
  NodeInteraction,
} from '../../../../models';
import { CamelRouteResource } from '../../../../models/camel';
import { EntityType } from '../../../../models/camel/entities';
import { camelRouteWithDisabledSteps, TestProvidersWrapper } from '../../../../stubs';
import { getFirstCatalogMap } from '../../../../stubs/test-load-catalog';
import { CanvasNode } from '../../Canvas';
import { ControllerService } from '../../Canvas/controller.service';
import { FlowService } from '../../Canvas/flow.service';
import { useDuplicateStep } from '../hooks/duplicate-step.hook';
import { usePasteStep } from '../hooks/paste-step.hook';
import { NodeContextMenu } from './NodeContextMenu';

// Mock the `usePasteStep` hook
jest.mock('../hooks/paste-step.hook', () => ({
  usePasteStep: jest.fn(),
}));

// Mock the `useDuplicateStep` hook
jest.mock('../hooks/duplicate-step.hook', () => ({
  useDuplicateStep: jest.fn(),
}));

describe('NodeContextMenu', () => {
  let element: GraphElement<ElementModel, CanvasNode['data']>;
  let vizNode: IVisualizationNode | undefined;
  let nodeInteractions: NodeInteraction;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, catalogsMap.patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Component, catalogsMap.componentCatalogMap);

    (useDuplicateStep as jest.Mock).mockReturnValue({
      canDuplicate: false,
    });

    (usePasteStep as jest.Mock).mockReturnValue({
      isCompatible: false,
    });
  });

  beforeEach(() => {
    nodeInteractions = {
      canHavePreviousStep: false,
      canHaveNextStep: false,
      canHaveChildren: false,
      canHaveSpecialChildren: false,
      canReplaceStep: false,
      canRemoveStep: false,
      canRemoveFlow: false,
      canBeDisabled: false,
    };
    vizNode = createVisualizationNode('test', { catalogKind: CatalogKind.Entity, name: EntityType.Route });
    jest.spyOn(vizNode, 'getNodeInteraction').mockReturnValue(nodeInteractions);
    element = {
      getData: () => {
        return { vizNode } as CanvasNode['data'];
      },
    } as unknown as GraphElement<ElementModel, CanvasNode['data']>;
  });

  const TestWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => {
    const visualizationController = ControllerService.createController();
    return <VisualizationProvider controller={visualizationController}>{children}</VisualizationProvider>;
  };

  it('should render an empty component when there is no vizNode', () => {
    vizNode = undefined;
    const { container } = render(<NodeContextMenu element={element} />);

    expect(container).toMatchSnapshot();
  });

  it('should always render copy item', () => {
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-copy');

    expect(item).toBeInTheDocument();
  });

  it('should render a PrependStep item if canHavePreviousStep is true', () => {
    nodeInteractions.canHavePreviousStep = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-prepend');

    expect(item).toBeInTheDocument();
  });

  it('should render an AppendStep item if canHaveNextStep is true', () => {
    nodeInteractions.canHaveNextStep = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-append');

    expect(item).toBeInTheDocument();
  });

  it('should render a Duplicate item if canDuplicate is true ', () => {
    nodeInteractions.canHaveNextStep = true;
    // Mock the `useDuplicateStep` hook
    (useDuplicateStep as jest.Mock).mockReturnValue({
      canDuplicate: true,
    });

    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-duplicate');

    expect(item).toBeInTheDocument();
  });

  it('should render an InsertStep item if canHaveChildren is true', () => {
    nodeInteractions.canHaveChildren = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-insert');

    expect(item).toBeInTheDocument();
  });

  it('should render an Paste as child item if canHaveChildren and isCompatible is true', () => {
    nodeInteractions.canHaveChildren = true;
    // Mock the `usePasteStep` hook to return compatible state
    (usePasteStep as jest.Mock).mockReturnValue({
      isCompatible: true,
    });

    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-paste-as-child');

    expect(item).toBeInTheDocument();
  });

  it('should render a Paste as next step item if canHaveNextStep and isCompatible is true ', () => {
    nodeInteractions.canHaveNextStep = true;
    // Mock the `usePasteStep` hook to return compatible state
    (usePasteStep as jest.Mock).mockReturnValue({
      isCompatible: true,
    });

    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-paste-as-next-step');

    expect(item).toBeInTheDocument();
  });

  it('should render an InsertSpecialStep item if canHaveSpecialChildren is true', () => {
    nodeInteractions.canHaveSpecialChildren = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-insert-special');

    expect(item).toBeInTheDocument();
  });

  it('should render an Paste as special child item if canHaveSpecialChildren and isCompatible is true', () => {
    nodeInteractions.canHaveSpecialChildren = true;
    // Mock the `usePasteStep` hook to return compatible state
    (usePasteStep as jest.Mock).mockReturnValue({
      isCompatible: true,
    });

    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-paste-as-special-child');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemDisableStep item if canBeDisabled is true', () => {
    nodeInteractions.canBeDisabled = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-disable');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemEnableAllSteps', () => {
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

    const { Provider } = TestProvidersWrapper({ camelResource });
    const wrapper = render(
      <Provider>
        <VisualizationProvider controller={visualizationController}>
          <NodeContextMenu element={element} />
        </VisualizationProvider>
      </Provider>,
    );

    const item = wrapper.queryByTestId('context-menu-item-enable-all');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemReplaceStep item if canReplaceStep is true', () => {
    nodeInteractions.canReplaceStep = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-replace');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemDeleteStep item if canRemoveStep is true', () => {
    nodeInteractions.canRemoveStep = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-delete');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemDeleteGroup item if canRemoveFlow is true', () => {
    nodeInteractions.canRemoveFlow = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-container-remove');

    expect(item).toBeInTheDocument();
  });

  it('should render an ItemHideOtherFlows item if canRemoveFlow is true', () => {
    nodeInteractions.canRemoveFlow = true;
    const wrapper = render(<NodeContextMenu element={element} />, { wrapper: TestWrapper });

    const item = wrapper.getByTestId('context-menu-item-hide-rest');

    expect(item).toBeInTheDocument();
  });
});
