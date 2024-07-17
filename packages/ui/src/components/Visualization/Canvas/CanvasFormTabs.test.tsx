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
} from '../../../models';
import { IVisualizationNode } from '../../../models/visualization/base-visual-entity';
import { VisibleFlowsProvider } from '../../../providers';
import { EntitiesContext, EntitiesProvider } from '../../../providers/entities.provider';
import { camelRouteJson } from '../../../stubs';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { SchemaService } from '../../Form';
import { CanvasNode } from './canvas.models';
import { CanvasService } from './canvas.service';
import { CanvasFormTabs } from './CanvasFormTabs';

describe('CanvasFormTabs', () => {
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
    selectedNode = nodes[0]; // timer
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('should show the User-updated field under the modified tab', () => {
    it('normal text field', async () => {
      render(
        <EntitiesProvider>
          <VisibleFlowsProvider>
            <CanvasFormTabs selectedNode={selectedNode} />
          </VisibleFlowsProvider>
        </EntitiesProvider>,
      );

      const defaultTab = screen.getByRole('button', { name: 'All Fields' });
      const modifiedTab = screen.getByRole('button', { name: 'User Modified' });

      expect(defaultTab).toBeInTheDocument();
      expect(modifiedTab).toBeInTheDocument();

      act(() => {
        fireEvent.click(modifiedTab);
      });

      const inputVariableReceiveModifiedTabElement = screen
        .queryAllByRole('textbox')
        .filter((textbox) => textbox.getAttribute('label') === 'Variable Receive');
      expect(inputVariableReceiveModifiedTabElement).toHaveLength(0);

      act(() => {
        fireEvent.click(defaultTab);
      });

      await act(async () => {
        const inputVariableReceiveDefaultTabElement = screen
          .getAllByRole('textbox')
          .filter((textbox) => textbox.getAttribute('label') === 'Variable Receive');
        fireEvent.change(inputVariableReceiveDefaultTabElement[0], { target: { value: 'test' } });
        fireEvent.blur(inputVariableReceiveDefaultTabElement[0]);
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const defaultTab = screen.getByRole('button', { name: 'All Fields' });
      const modifiedTab = screen.getByRole('button', { name: 'User Modified' });

      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByTestId('launch-expression-modal-btn')).toBeNull();

      act(() => {
        fireEvent.click(defaultTab);
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );

      const defaultTab = screen.getByRole('button', { name: 'All Fields' });
      const modifiedTab = screen.getByRole('button', { name: 'User Modified' });
      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeNull();

      act(() => {
        fireEvent.click(defaultTab);
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
        fireEvent.click(defaultTab);
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const defaultTab = screen.getByRole('button', { name: 'All Fields' });
      const modifiedTab = screen.getByRole('button', { name: 'User Modified' });
      act(() => {
        fireEvent.click(modifiedTab);
      });

      expect(screen.queryByRole('button', { name: 'Typeahead menu toggle' })).toBeNull();

      act(() => {
        fireEvent.click(defaultTab);
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
        fireEvent.click(defaultTab);
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const button = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
      await act(async () => {
        fireEvent.input(idInput[0], { target: { value: 'modified' } });
      });
      expect(camelRoute.from.steps[0].marshal!.avro).toBeUndefined();
      expect(camelRoute.from.steps[0].marshal!.id).toEqual('modified');

      const button = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const button = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const weightedLoadBalancer = screen.getByTestId('loadbalancer-dropdownitem-weightedLoadBalancer');
      await act(async () => {
        fireEvent.click(weightedLoadBalancer.getElementsByTagName('button')[0]);
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
            <CanvasFormTabs selectedNode={selectedNode as unknown as CanvasNode} />
          </VisibleFlowsProvider>
        </EntitiesContext.Provider>,
      );
      const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
      await act(async () => {
        fireEvent.input(idInput[0], { target: { value: 'modified' } });
      });
      expect(camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer).toBeUndefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');

      const button = screen.getAllByRole('button', { name: 'Typeahead menu toggle' });
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const weighted = screen.getByTestId('loadbalancer-dropdownitem-weightedLoadBalancer');
      await act(async () => {
        fireEvent.click(weighted.getElementsByTagName('button')[0]);
      });
      expect(camelRoute.from.steps[0].loadBalance!.weightedLoadBalancer).toBeDefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');
    });
  });
});
