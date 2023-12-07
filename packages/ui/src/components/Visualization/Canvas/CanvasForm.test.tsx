import { render } from '@testing-library/react';
import { JSONSchemaType } from 'ajv';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../providers/entities.provider';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import { AutoFields } from '@kaoto-next/uniforms-patternfly';
import { AutoForm } from 'uniforms';
import { CustomAutoField } from '../../Form/CustomAutoField';
import * as componentCatalogMap from '@kaoto-next/camel-catalog/camel-catalog-aggregate-components.json';
import * as kameletCatalogMap from '@kaoto-next/camel-catalog/kamelets-aggregate.json';
import { SchemaService } from '../../Form';
import { getNonDefaultProperties, getNonEmptyProperties } from './CanvasForm';

describe('CanvasForm', () => {
  const omitFields = ['expression', 'dataFormatType', 'outputs', 'steps', 'when', 'otherwise', 'doCatch', 'doFinally'];
  const schemaService = new SchemaService();

  const schema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
      },
    },
  } as unknown as JSONSchemaType<unknown>;

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
      schema: null as unknown as JSONSchemaType<unknown>,
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
      schema: null as unknown as JSONSchemaType<unknown>,
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

  it('should render for all component without an error', () => {
    Object.entries(componentCatalogMap).forEach(([name, catalog]) => {
      try {
        if (name === 'default') return;
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const schema = schemaService.getSchemaBridge((catalog as any).propertiesSchema);
        render(
          <AutoForm schema={schema!} model={{}} onChangeModel={() => {}}>
            <AutoFields autoField={CustomAutoField} omitFields={omitFields} />
          </AutoForm>,
        );
      } catch (e) {
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        throw new Error(`Error rendering ${name} component: ${(e as any).message}`);
      }
    });
  });

  it('should render for all kamelets without an error', () => {
    Object.entries(kameletCatalogMap).forEach(([name, kamelet]) => {
      try {
        if (name === 'default') return;
        expect(kamelet).toBeDefined();
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        const schema = (kamelet as any).propertiesSchema;
        const bridge = schemaService.getSchemaBridge(schema);
        render(
          <AutoForm schema={bridge!} model={{}} onChangeModel={() => {}}>
            <AutoFields autoField={CustomAutoField} omitFields={omitFields} />
          </AutoForm>,
        );
      } catch (e) {
        /* eslint-disable  @typescript-eslint/no-explicit-any */
        throw new Error(`Error rendering ${name} component: ${(e as any).message}`);
      }
    });
  });
});

describe('CanvasForm getNonDefaultProperties()', () => {
  const schema = {
    type: 'object',
    properties: {
      parameters: {
        properties: {
          events: {
            type: 'string',
            default: 'CREATE,MODIFY,DELETE',
            title: 'Events',
          },
          concurrentConsumers: {
            type: 'integer',
            default: 1,
            title: 'Concurrent Consumers',
          },
          bridgeErrorHandler: {
            type: 'boolean',
            default: false,
            title: 'Bridge Error Handler',
          },
        },
      },
    },
  } as unknown as JSONSchemaType<unknown>;

  const newModel: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
      concurrentConsumers: '1',
      bridgeErrorHandler: false,
    },
  };

  const newModelExpected: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
    },
  };

  it('should return only the properties which are different from default', () => {
    const newModelClean = getNonDefaultProperties(schema?.properties.parameters.properties, newModel);
    expect(newModelClean).toMatchObject(newModelExpected);
  });
});

describe('CanvasForm getNonEmptyProperties()', () => {
  const schema = {
    type: 'object',
    properties: {
      parameters: {
        properties: {
          events: {
            type: 'string',
            default: 'CREATE,MODIFY,DELETE',
            title: 'Events',
          },
          concurrentConsumers: {
            type: 'integer',
            default: 1,
            title: 'Concurrent Consumers',
          },
          bridgeErrorHandler: {
            type: 'boolean',
            default: false,
            title: 'Bridge Error Handler',
          },
          exchangePattern: {
            type: 'object',
            title: 'Exchange Pattern',
          },
        },
      },
    },
  } as unknown as JSONSchemaType<unknown>;

  const newModel: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
      concurrentConsumers: '',
      bridgeErrorHandler: false,
      exchangePattern: {},
    },
  };

  const newModelIntermediate: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
      concurrentConsumers: '',
      exchangePattern: {},
    },
  };

  const newModelExpected: Record<string, unknown> = {
    id: 'from-7126',
    description: 'test',
    steps: [],
    uri: 'file-watch',
    parameters: {
      events: 'CREATE',
    },
  };

  it('should return only the properties which are different from default', () => {
    const newModelClean = getNonDefaultProperties(schema?.properties.parameters.properties, newModel);
    expect(newModelClean).toMatchObject(newModelIntermediate);
  });

  it('should return only the non-empty properties', () => {
    const newModelClean = getNonEmptyProperties(newModel);
    expect(newModelClean).toMatchObject(newModelExpected);
  });
});
