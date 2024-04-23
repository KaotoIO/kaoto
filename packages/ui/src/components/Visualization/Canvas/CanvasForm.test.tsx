import * as catalogIndex from '@kaoto-next/camel-catalog/index.json';
import { RouteDefinition } from '@kaoto-next/camel-catalog/types';
import { AutoField, AutoFields } from '@kaoto-next/uniforms-patternfly';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { AutoForm } from 'uniforms';
import {
  CamelCatalogService,
  CamelRouteVisualEntity,
  CatalogKind,
  ICamelComponentDefinition,
  ICamelDataformatDefinition,
  ICamelLanguageDefinition,
  ICamelLoadBalancerDefinition,
  ICamelProcessorDefinition,
  IKameletDefinition,
  KameletVisualEntity,
  KaotoSchemaDefinition,
} from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { VisibleFlowsContext, VisibleFlowsProvider } from '../../../providers';
import { EntitiesContext, EntitiesProvider } from '../../../providers/entities.provider';
import { camelRouteJson, kameletJson } from '../../../stubs';
import { SchemaService } from '../../Form';
import { CustomAutoFieldDetector } from '../../Form/CustomAutoField';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import { CanvasService } from './canvas.service';
import { VisualFlowsApi } from '../../../models/visualization/flows/support/flows-visibility';

describe('CanvasForm', () => {
  let camelRouteVisualEntity: CamelRouteVisualEntity;
  let selectedNode: CanvasNode;
  let componentCatalogMap: Record<string, ICamelComponentDefinition>;
  let patternCatalogMap: Record<string, ICamelProcessorDefinition>;
  let kameletCatalogMap: Record<string, IKameletDefinition>;
  const schemaService = new SchemaService();

  beforeAll(async () => {
    componentCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.components.file);
    delete componentCatalogMap.default;
    const modelCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.models.file);
    delete modelCatalog.default;
    patternCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.patterns.file);
    delete patternCatalogMap.default;
    kameletCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.kamelets.file);
    delete kameletCatalogMap.default;
    const languageCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.languages.file);
    delete languageCatalog.default;
    const dataformatCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.dataformats.file);
    delete dataformatCatalog.default;
    const loadbalancerCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.loadbalancers.file);
    delete loadbalancerCatalog.default;
    const entitiesCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.entities.file);
    delete entitiesCatalog.default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Component,
      componentCatalogMap as unknown as Record<string, ICamelComponentDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Pattern,
      patternCatalogMap as unknown as Record<string, ICamelProcessorDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Kamelet,
      kameletCatalogMap as unknown as Record<string, IKameletDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Language,
      languageCatalog as unknown as Record<string, ICamelLanguageDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Dataformat,
      dataformatCatalog as unknown as Record<string, ICamelDataformatDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Loadbalancer,
      loadbalancerCatalog as unknown as Record<string, ICamelLoadBalancerDefinition>,
    );
    CamelCatalogService.setCatalogKey(
      CatalogKind.Entity,
      entitiesCatalog as unknown as Record<string, ICamelProcessorDefinition>,
    );
  });

  beforeEach(() => {
    camelRouteVisualEntity = new CamelRouteVisualEntity(camelRouteJson.route);
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
          getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson.route),
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
          getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson.route),
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
          getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson.route),
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

    const idField = screen.getAllByLabelText('Description', { selector: 'input' })[0];
    act(() => {
      fireEvent.change(idField, { target: { value: '' } });
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
      const button = screen
        .getAllByRole('button')
        .filter((button) => button.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
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

      const button = screen
        .getAllByRole('button')
        .filter((button) => button.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
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
      const button = screen
        .getAllByRole('button')
        .filter((button) => button.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const avro = screen.getByTestId('loadbalancer-dropdownitem-weighted');
      await act(async () => {
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });
      expect(camelRoute.from.steps[0].loadBalance!.weighted).toBeDefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('lb');

      const idInput = screen.getAllByRole('textbox').filter((textbox) => textbox.getAttribute('label') === 'Id');
      await act(async () => {
        fireEvent.input(idInput[1], { target: { value: 'modified' } });
      });
      expect(camelRoute.from.steps[0].loadBalance!.weighted).toBeDefined();
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

      const button = screen
        .getAllByRole('button')
        .filter((button) => button.innerHTML.includes(SchemaService.DROPDOWN_PLACEHOLDER));
      await act(async () => {
        fireEvent.click(button[0]);
      });
      const avro = screen.getByTestId('loadbalancer-dropdownitem-weighted');
      await act(async () => {
        fireEvent.click(avro.getElementsByTagName('button')[0]);
      });
      expect(camelRoute.from.steps[0].loadBalance!.weighted).toBeDefined();
      expect(camelRoute.from.steps[0].loadBalance!.id).toEqual('modified');
    });
  });

  describe('Exhaustive tests', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should render for all component without an error', async () => {
      Object.entries(componentCatalogMap).forEach(([name, catalog]) => {
        try {
          if (name === 'default') return;
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          const schema = schemaService.getSchemaBridge((catalog as any).propertiesSchema);
          render(
            <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
              <AutoForm schema={schema!} model={{}} onChangeModel={() => {}}>
                <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
              </AutoForm>
            </AutoField.componentDetectorContext.Provider>,
          );
        } catch (e) {
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          throw new Error(`Error rendering ${name} component: ${(e as any).message}`);
        }
      });
    });

    it('should render for all kamelets without an error', async () => {
      Object.entries(kameletCatalogMap).forEach(([name, kamelet]) => {
        try {
          if (name === 'default') return;
          expect(kamelet).toBeDefined();
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          const schema = (kamelet as any).propertiesSchema;
          const bridge = schemaService.getSchemaBridge(schema);
          render(
            <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
              <AutoForm schema={bridge!} model={{}} onChangeModel={() => {}}>
                <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
              </AutoForm>
            </AutoField.componentDetectorContext.Provider>,
          );
        } catch (e) {
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          throw new Error(`Error rendering ${name} component: ${(e as any).message}`);
        }
      });
    });

    it('should render for all patterns without an error', async () => {
      Object.entries(patternCatalogMap).forEach(([name, pattern]) => {
        try {
          if (name === 'default') return;
          expect(pattern).toBeDefined();
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          const schema = (pattern as any).propertiesSchema;
          const bridge = schemaService.getSchemaBridge(schema);
          render(
            <AutoField.componentDetectorContext.Provider value={CustomAutoFieldDetector}>
              <AutoForm schema={bridge!} model={{}} onChangeModel={() => {}}>
                <AutoFields omitFields={SchemaService.OMIT_FORM_FIELDS} />
              </AutoForm>
            </AutoField.componentDetectorContext.Provider>,
          );
        } catch (e) {
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          throw new Error(`Error rendering ${name} pattern: ${(e as any).message}`);
        }
      });
    });
  });
});
