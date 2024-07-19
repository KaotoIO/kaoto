import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary, RouteDefinition } from '@kaoto/camel-catalog/types';
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
import { SchemaService } from '../../Form';
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

  describe('should persists changes from both expression editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('expression => main form', async () => {
      const camelRoute = {
        from: {
          uri: 'timer:tutorial',
          steps: [
            {
              setHeader: {
                name: 'foo',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode();
      const setHeaderNode = rootNode.getChildren()![0].getChildren()![0];
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: setHeaderNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const launchExpression = screen.getByTestId('launch-expression-modal-btn');
      act(() => {
        fireEvent.click(launchExpression);
      });
      const button = screen
        .getAllByTestId('typeahead-select-input')
        .filter((input) => input.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
      act(() => {
        fireEvent.click(button[0]);
      });
      const simple = screen.getByTestId('expression-dropdownitem-simple');
      act(() => {
        fireEvent.click(simple.getElementsByTagName('button')[0]);
      });
      const expressionInput = screen
        .getAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('name') === 'expression');
      const applyBtn = screen.getAllByRole('button').filter((button) => button.textContent === 'Apply');
      act(() => {
        fireEvent.input(expressionInput[0], { target: { value: '${header.foo}' } });
        fireEvent.click(applyBtn[0]);
      });
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((camelRoute.from.steps[0].setHeader!.expression as any).simple.expression).toEqual('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('foo');

      const filtered = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Name');
      act(() => {
        fireEvent.input(filtered[0], { target: { value: 'bar' } });
      });
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((camelRoute.from.steps[0].setHeader!.expression as any).simple.expression).toEqual('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('bar');
    });

    it('main form => expression', async () => {
      const camelRoute = {
        from: {
          uri: 'timer:tutorial',
          steps: [
            {
              setHeader: {
                name: 'foo',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode();
      const setHeaderNode = rootNode.getChildren()![0].getChildren()![0];
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: setHeaderNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const filtered = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Name');
      act(() => {
        fireEvent.input(filtered[0], { target: { value: 'bar' } });
      });
      expect(camelRoute.from.steps[0].setHeader!.expression).toBeUndefined();
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('bar');

      const launchExpression = screen.getByTestId('launch-expression-modal-btn');
      act(() => {
        fireEvent.click(launchExpression);
      });
      const button = screen
        .getAllByTestId('typeahead-select-input')
        .filter((input) => input.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
      act(() => {
        fireEvent.click(button[0]);
      });
      const simple = screen.getByTestId('expression-dropdownitem-simple');
      act(() => {
        fireEvent.click(simple.getElementsByTagName('button')[0]);
      });
      const expressionInput = screen
        .getAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('name') === 'expression');
      const applyBtn = screen.getAllByRole('button').filter((button) => button.textContent === 'Apply');
      act(() => {
        fireEvent.input(expressionInput[0], { target: { value: '${header.foo}' } });
        fireEvent.click(applyBtn[0]);
      });
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      expect((camelRoute.from.steps[0].setHeader!.expression as any).simple.expression).toEqual('${header.foo}');
      expect(camelRoute.from.steps[0].setHeader!.name).toEqual('bar');
    });
  });

  describe('should persists changes from both dataformat editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('dataformat => main form', async () => {
      const camelRoute = {
        from: {
          uri: 'timer:tutorial',
          steps: [
            {
              marshal: {
                id: 'ms',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode();
      const marshalNode = rootNode.getChildren()![0].getChildren()![0];
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: marshalNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const button = screen.getAllByRole('button', { name: 'Menu toggle' });
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const avro = screen.getByTestId('dataformat-dropdownitem-avro');
      await act(async () => {
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });
      expect(camelRoute.from.steps[0].marshal!.avro).toBeDefined();
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('ms');

      const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
      await act(async () => {
        fireEvent.input(idInput[1], { target: { value: 'modified' } });
      });
      expect(camelRoute.from.steps[0].marshal!.avro).toBeDefined();
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('modified');
    });

    it('main form => dataformat', async () => {
      const camelRoute = {
        from: {
          uri: 'timer:tutorial',
          steps: [
            {
              marshal: {
                id: 'ms',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode();
      const marshalNode = rootNode.getChildren()![0].getChildren()![0];
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: marshalNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
      await act(async () => {
        fireEvent.input(idInput[0], { target: { value: 'modified' } });
      });
      expect(camelRoute.from.steps[0].marshal!.avro).toBeUndefined();
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('modified');

      const button = screen.getAllByRole('button', { name: 'Menu toggle' });
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const avro = screen.getByTestId('dataformat-dropdownitem-avro');
      await act(async () => {
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });
      expect(camelRoute.from.steps[0].marshal!.avro).toBeDefined();
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('modified');
    });
  });

  describe('should persists changes from both loadbalancer editor and main form', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('loadbalancer => main form', async () => {
      const camelRoute = {
        from: {
          uri: 'timer:tutorial',
          steps: [
            {
              loadBalance: {
                id: 'lb',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode();
      const loadBalanceNode = rootNode.getChildren()![0].getChildren()![0];
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: loadBalanceNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const button = screen.getAllByRole('button', { name: 'Menu toggle' });
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const avro = screen.getByTestId('loadbalancer-dropdownitem-weightedLoadBalancer');
      await act(async () => {
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });
      expect(camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer).toBeDefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('lb');

      const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
      await act(async () => {
        fireEvent.input(idInput[1], { target: { value: 'modified' } });
      });
      expect(camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer).toBeDefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');
    });

    it('main form => loadbalancer', async () => {
      const camelRoute = {
        from: {
          uri: 'timer:tutorial',
          steps: [
            {
              loadBalance: {
                id: 'lb',
              },
            },
          ],
        },
      } as RouteDefinition;
      const entity = new CamelRouteVisualEntity(camelRoute);
      const rootNode: IVisualizationNode = entity.toVizNode();
      const loadBalanceNode = rootNode.getChildren()![0].getChildren()![0];
      const selectedNode = {
        id: '1',
        type: 'node',
        data: {
          vizNode: loadBalanceNode,
        },
      };

      render(
        <EntitiesContext.Provider value={null}>
          <VisibleFlowsProvider>
            <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
      await act(async () => {
        fireEvent.input(idInput[0], { target: { value: 'modified' } });
      });
      expect(camelRoute.from.steps[0].loadBalance!.weighted).toBeUndefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');

      const button = screen.getAllByRole('button', { name: 'Menu toggle' });
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const avro = screen.getByTestId('loadbalancer-dropdownitem-weightedLoadBalancer');
      await act(async () => {
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });
      expect(camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer).toBeDefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');
    });
  });
});
