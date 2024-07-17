import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  CamelCatalogService,
  CamelRouteVisualEntity,
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
  KameletVisualEntity,
  KaotoSchemaDefinition,
} from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { VisualFlowsApi } from '../../../models/visualization/flows/support/flows-visibility';
import { VisibleFlowsContext, VisibleFlowsProvider } from '../../../providers';
import { EntitiesContext, EntitiesProvider } from '../../../providers/entities.provider';
import { camelRouteJson, kameletJson } from '../../../stubs';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import { CanvasService } from './canvas.service';

describe('CanvasForm', () => {
  let camelRouteVisualEntity: CamelRouteVisualEntity;
  let selectedNode: CanvasNode;
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let patternCatalogMap: Record<string, ICamelProcessorDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;

  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    componentCatalogMap = catalogsMap.componentCatalogMap;
    patternCatalogMap = catalogsMap.patternCatalogMap;
    kameletCatalogMap = catalogsMap.kameletsCatalogMap;

    CamelCatalogService.setCatalogKey(CatalogKind.Component, componentCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Pattern, patternCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Kamelet, kameletCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Processor, catalogsMap.modelCatalogMap);
    CamelCatalogService.setCatalogKey(CatalogKind.Language, catalogsMap.languageCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Dataformat, catalogsMap.dataformatCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, catalogsMap.loadbalancerCatalog);
    CamelCatalogService.setCatalogKey(CatalogKind.Entity, catalogsMap.entitiesCatalog);
  });

  beforeEach(() => {
    camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
    const { nodes } = CanvasService.getFlowDiagram(camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[2]; // choice
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render', () => {
    const { container } = render(
      <EntitiesProvider>
        <VisibleFlowsProvider>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsProvider>
      </EntitiesProvider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render nothing if no schema is available', () => {
    const selectedNode: CanvasNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode: {
          getComponentSchema: () => undefined,
          getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson),
        } as unknown as IVisualizationNode,
      },
    };

    const { container } = render(
      <EntitiesContext.Provider value={null}>
        <VisibleFlowsProvider>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsProvider>
      </EntitiesContext.Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should render nothing if no schema and no definition is available', () => {
    const visualComponentSchema: VisualComponentSchema = {
      title: 'My Node',
      schema: null as unknown as KaotoSchemaDefinition['schema'],
      definition: null,
    };

    const selectedNode: CanvasNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode: {
          getComponentSchema: () => visualComponentSchema,
          getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson),
        } as unknown as IVisualizationNode,
      },
    };

    const { container } = render(
      <EntitiesContext.Provider value={null}>
        <VisibleFlowsProvider>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsProvider>
      </EntitiesContext.Provider>,
    );

    expect(container).toMatchSnapshot();
  });

  it('should update the parameters object if null', () => {
    const visualComponentSchema: VisualComponentSchema = {
      title: 'My Node',
      schema: null as unknown as KaotoSchemaDefinition['schema'],
      definition: {
        parameters: null,
      },
    };

    const selectedNode: CanvasNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode: {
          getComponentSchema: () => visualComponentSchema,
          getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson),
        } as unknown as IVisualizationNode,
      },
    };

    render(
      <EntitiesContext.Provider value={null}>
        <VisibleFlowsProvider>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsProvider>
      </EntitiesContext.Provider>,
    );

    expect(visualComponentSchema.definition.parameters).toEqual({});
  });

  it("should serialize empty strings `''` as `undefined`", async () => {
    const flowId = camelRouteVisualEntity.id;
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = CanvasService.getFlowDiagram(camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider value={{ visibleFlows: { [flowId]: true }, visualFlowsApi }}>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const idField = screen.getAllByLabelText('Description', { selector: 'textarea' })[0];
    act(() => {
      fireEvent.change(idField, { target: { value: '' } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(camelRouteVisualEntity.route.description).toBeUndefined();
  });

  it("should serialize empty strings(with space characters) `' '` as `undefined`", async () => {
    const flowId = camelRouteVisualEntity.id;
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = CanvasService.getFlowDiagram(camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider value={{ visibleFlows: { [flowId]: true }, visualFlowsApi }}>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const idField = screen.getAllByLabelText('Description', { selector: 'textarea' })[0];
    act(() => {
      fireEvent.change(idField, { target: { value: ' ' } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(camelRouteVisualEntity.route.description).toBeUndefined();
  });

  it('should allow consumers to update the Camel Route ID', async () => {
    const flowId = camelRouteVisualEntity.id;
    const newName = 'MyNewId';
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = CanvasService.getFlowDiagram(camelRouteVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider value={{ visibleFlows: { [flowId]: true }, visualFlowsApi }}>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const idField = screen.getAllByLabelText('Id', { selector: 'input' })[0];
    act(() => {
      fireEvent.change(idField, { target: { value: newName } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(camelRouteVisualEntity.id).toEqual(newName);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'renameFlow', flowId, newName });
  });

  it('should allow consumers to update the Kamelet name', async () => {
    const kameletVisualEntity = new KameletVisualEntity(kameletJson);
    const flowId = kameletVisualEntity.id;
    const newName = 'MyNewName';
    const dispatchSpy = jest.fn();
    const visualFlowsApi = new VisualFlowsApi(dispatchSpy);
    const { nodes } = CanvasService.getFlowDiagram(kameletVisualEntity.toVizNode());
    selectedNode = nodes[nodes.length - 1];

    render(
      <EntitiesProvider>
        <VisibleFlowsContext.Provider value={{ visibleFlows: { [flowId]: true }, visualFlowsApi }}>
          <CanvasForm selectedNode={selectedNode} />
        </VisibleFlowsContext.Provider>
      </EntitiesProvider>,
    );

    const NameField = screen.getByDisplayValue('user-source');
    act(() => {
      fireEvent.change(NameField, { target: { value: newName } });
    });

    const closeSideBarButton = screen.getByTestId('close-side-bar');
    act(() => {
      fireEvent.click(closeSideBarButton);
    });

    expect(kameletVisualEntity.id).toEqual(newName);
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'renameFlow', flowId, newName });
  });
});
