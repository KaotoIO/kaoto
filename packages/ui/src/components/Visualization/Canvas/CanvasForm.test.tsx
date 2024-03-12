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
  ICamelDataformatDefinition,
  ICamelLanguageDefinition,
  ICamelLoadBalancerDefinition,
  ICamelProcessorDefinition,
  KaotoSchemaDefinition,
} from '../../../models';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../providers/entities.provider';
import { SchemaService } from '../../Form';
import { CustomAutoFieldDetector } from '../../Form/CustomAutoField';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';

describe('CanvasForm', () => {
  const schemaService = new SchemaService();

  const schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
    },
  } as unknown as KaotoSchemaDefinition['schema'];

  beforeAll(async () => {
    const patternCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.patterns.file);
    delete patternCatalog.default;
    const languageCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.languages.file);
    delete languageCatalog.default;
    const dataformatCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.dataformats.file);
    delete dataformatCatalog.default;
    const loadbalancerCatalog = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.loadbalancers.file);
    delete loadbalancerCatalog.default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Pattern,
      patternCatalog as unknown as Record<string, ICamelProcessorDefinition>,
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
  });

  it('should render', () => {
    const visualComponentSchema: VisualComponentSchema = {
      title: 'My Node',
      schema,
      definition: {
        name: 'my node',
      },
    };

    const selectedNode: CanvasNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode: {
          getComponentSchema: () => visualComponentSchema,
        } as IVisualizationNode,
      },
    };

    const { container } = render(
      <EntitiesContext.Provider value={null}>
        <CanvasForm selectedNode={selectedNode} />
      </EntitiesContext.Provider>,
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
        } as IVisualizationNode,
      },
    };

    const { container } = render(
      <EntitiesContext.Provider value={null}>
        <CanvasForm selectedNode={selectedNode} />
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
        } as IVisualizationNode,
      },
    };

    const { container } = render(
      <EntitiesContext.Provider value={null}>
        <CanvasForm selectedNode={selectedNode} />
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
        } as IVisualizationNode,
      },
    };

    render(
      <EntitiesContext.Provider value={null}>
        <CanvasForm selectedNode={selectedNode} />
      </EntitiesContext.Provider>,
    );

    expect(visualComponentSchema.definition.parameters).toEqual({});
  });

  describe('should persists changes from both expression editor and main form', () => {
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
          <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
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
          <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
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
          <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
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
          <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
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
          <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
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
          <CanvasForm selectedNode={selectedNode as unknown as CanvasNode} />
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

  /*
   * Exhaustive tests
   */

  it('should render for all component without an error', async () => {
    const componentCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.components.file);
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
    const kameletCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.kamelets.file);
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
    const patternCatalogMap = await import('@kaoto-next/camel-catalog/' + catalogIndex.catalogs.patterns.file);
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
