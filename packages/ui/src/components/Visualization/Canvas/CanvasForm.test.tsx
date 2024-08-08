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
import {
  VisibleFlowsContext,
  VisibleFlowsProvider,
  CanvasFormTabsContext,
  CanvasFormTabsProvider,
} from '../../../providers';
import { EntitiesContext, EntitiesProvider } from '../../../providers/entities.provider';
import { camelRouteJson, kameletJson } from '../../../stubs';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SchemaService } from '../../Form';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import { CanvasService } from './canvas.service';
import { FormTabsModes } from './canvasformtabs.modes';

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
          <CanvasFormTabsContext.Provider
            value={{
              selectedTab: FormTabsModes.ALL_FIELDS,
              onTabChange: jest.fn(),
            }}
          >
            <CanvasForm selectedNode={selectedNode} />
          </CanvasFormTabsContext.Provider>
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
          <CanvasFormTabsContext.Provider
            value={{
              selectedTab: FormTabsModes.ALL_FIELDS,
              onTabChange: jest.fn(),
            }}
          >
            <CanvasForm selectedNode={selectedNode} />
          </CanvasFormTabsContext.Provider>
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
          <CanvasFormTabsContext.Provider
            value={{
              selectedTab: FormTabsModes.ALL_FIELDS,
              onTabChange: jest.fn(),
            }}
          >
            <CanvasForm selectedNode={selectedNode} />
          </CanvasFormTabsContext.Provider>
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

  describe('should show the User-updated field under the modified tab', () => {
    beforeEach(() => {
      camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
      const { nodes } = CanvasService.getFlowDiagram(camelRouteVisualEntity.toVizNode());
      selectedNode = nodes[0]; // timer
    });

    it('normal text field', async () => {
      render(
        <EntitiesProvider>
          <VisibleFlowsProvider>
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsProvider>
          </VisibleFlowsProvider>
        </EntitiesProvider>,
      );

      const allTab = screen.getByRole('button', { name: 'All' });
      const modifiedTab = screen.getByRole('button', { name: 'Modified' });

      expect(allTab).toBeInTheDocument();
      expect(modifiedTab).toBeInTheDocument();

      act(() => {
        fireEvent.click(modifiedTab);
      });

      const inputVariableReceiveModifiedTabElement = screen
        .queryAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Variable Receive');
      expect(inputVariableReceiveModifiedTabElement).toHaveLength(0);

      act(() => {
        fireEvent.click(allTab);
      });

      await act(async () => {
        const inputVariableReceiveAllTabElement = screen
          .getAllByRole('textbox')
          .filter((textbox) => textbox.getAttribute('label') === 'Variable Receive');
        fireEvent.change(inputVariableReceiveAllTabElement[0], { target: { value: 'test' } });
        fireEvent.blur(inputVariableReceiveAllTabElement[0]);
      });

      act(() => {
        fireEvent.click(modifiedTab);
      });

      const inputVariableReceiveModifiedTabElementNew = screen
        .getAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Variable Receive');
      expect(inputVariableReceiveModifiedTabElementNew).toHaveLength(1);
    });

    it('expression field', async () => {
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
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
            </CanvasFormTabsProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const allTab = screen.getByRole('button', { name: 'All' });
      const modifiedTab = screen.getByRole('button', { name: 'Modified' });

      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByTestId('launch-expression-modal-btn')).toBeNull();

      act(() => {
        fireEvent.click(allTab);
      });

      const launchExpressionDefaultTab = screen.getByTestId('launch-expression-modal-btn');

      act(() => {
        fireEvent.click(launchExpressionDefaultTab);
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

      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.getByTestId('launch-expression-modal-btn')).toBeInTheDocument();
    });

    it('dataformat field', async () => {
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
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
            </CanvasFormTabsProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const allTab = screen.getByRole('button', { name: 'All' });
      const modifiedTab = screen.getByRole('button', { name: 'Modified' });
      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeNull();

      act(() => {
        fireEvent.click(allTab);
      });

      const dataformatDefaultTabButton = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
      await act(async () => {
        fireEvent.click(dataformatDefaultTabButton[0]);
      });
      const asn1 = screen.getByTestId('dataformat-dropdownitem-asn1');
      await act(async () => {
        fireEvent.click(asn1.getElementsByTagName('button')[0]);
      });

      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeInTheDocument();

      const inputUnmarshalTypeModifiedTabElement = screen
        .queryAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Unmarshal Type');
      expect(inputUnmarshalTypeModifiedTabElement).toHaveLength(0);

      act(() => {
        fireEvent.click(allTab);
      });

      await act(async () => {
        const inputUnmarshalTypeDefaultTabElement = screen
          .getAllByRole('textbox')
          .filter((textbox) => textbox.getAttribute('label') === 'Unmarshal Type');
        fireEvent.change(inputUnmarshalTypeDefaultTabElement[0], { target: { value: 'test' } });
        fireEvent.blur(inputUnmarshalTypeDefaultTabElement[0]);
      });

      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeInTheDocument();

      const inputUnmarshalTypeModifiedTabElementNew = screen
        .getAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Unmarshal Type');
      expect(inputUnmarshalTypeModifiedTabElementNew).toHaveLength(1);
    });

    it('loadbalancer field', async () => {
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
            <CanvasFormTabsProvider>
              <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
            </CanvasFormTabsProvider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const allTab = screen.getByRole('button', { name: 'All' });
      const modifiedTab = screen.getByRole('button', { name: 'Modified' });
      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeNull();

      act(() => {
        fireEvent.click(allTab);
      });

      const button = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const weightedLoadBalancer = screen.getByTestId('loadbalancer-dropdownitem-weightedLoadBalancer');
      await act(async () => {
        fireEvent.click(weightedLoadBalancer.getElementsByTagName('button')[0]);
      });

      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeInTheDocument();

      const inputDistributionRatioModifiedTabElement = screen
        .queryAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Distribution Ratio');
      expect(inputDistributionRatioModifiedTabElement).toHaveLength(0);

      act(() => {
        fireEvent.click(allTab);
      });

      await act(async () => {
        const inputDistributionRatioDefaultTabElement = screen
          .getAllByRole('textbox')
          .filter((textbox) => textbox.getAttribute('label') === 'Distribution Ratio');
        fireEvent.change(inputDistributionRatioDefaultTabElement[0], { target: { value: 'test' } });
        fireEvent.blur(inputDistributionRatioDefaultTabElement[0]);
      });

      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeInTheDocument();

      const inputDistributionRatioModifiedTabElementNew = screen
        .getAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Distribution Ratio');
      expect(inputDistributionRatioModifiedTabElementNew).toHaveLength(1);
    });
  });

  describe('should show the Required field under the required tab', () => {
    beforeEach(() => {
      camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson);
      const { nodes } = CanvasService.getFlowDiagram(camelRouteVisualEntity.toVizNode());
      selectedNode = nodes[0]; // timer
    });

    it('normal text field', async () => {
      render(
        <EntitiesProvider>
          <VisibleFlowsProvider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: FormTabsModes.REQUIRED_FIELDS,
                onTabChange: jest.fn(),
              }}
            >
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </VisibleFlowsProvider>
        </EntitiesProvider>,
      );

      const allTab = screen.getByRole('button', { name: 'All' });
      const requiredTab = screen.getByRole('button', { name: 'Required' });

      expect(allTab).toBeInTheDocument();
      expect(requiredTab).toBeInTheDocument();

      const inputTimerNameRequiredTabTabElement = screen
        .queryAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Timer Name');
      expect(inputTimerNameRequiredTabTabElement).toHaveLength(1);
    });

    it('expression field', async () => {
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
        <EntitiesProvider>
          <VisibleFlowsProvider>
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: FormTabsModes.REQUIRED_FIELDS,
                onTabChange: jest.fn(),
              }}
            >
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </VisibleFlowsProvider>
        </EntitiesProvider>,
      );

      expect(screen.getByTestId('launch-expression-modal-btn')).toBeInTheDocument();
    });

    it('dataformat field', async () => {
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
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: FormTabsModes.REQUIRED_FIELDS,
                onTabChange: jest.fn(),
              }}
            >
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeInTheDocument();
    });

    it('loadbalancer field', async () => {
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
            <CanvasFormTabsContext.Provider
              value={{
                selectedTab: FormTabsModes.REQUIRED_FIELDS,
                onTabChange: jest.fn(),
              }}
            >
              <CanvasForm selectedNode={selectedNode} />
            </CanvasFormTabsContext.Provider>
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeInTheDocument();
    });
  });
});
