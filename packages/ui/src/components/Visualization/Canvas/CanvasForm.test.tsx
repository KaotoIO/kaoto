import { render } from '@testing-library/react';
import { JSONSchemaType } from 'ajv';
import { IVisualizationNode, VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { EntitiesContext } from '../../../providers/entities.provider';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';

describe('CanvasForm', () => {
  it('should render', () => {
    const visualComponentSchema: VisualComponentSchema = {
      title: 'My Node',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      } as unknown as JSONSchemaType<unknown>,
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
      <EntitiesContext.Provider value={undefined}>
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
      <EntitiesContext.Provider value={undefined}>
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
      <EntitiesContext.Provider value={undefined}>
        <CanvasForm selectedNode={selectedNode} />
      </EntitiesContext.Provider>,
    );

    expect(container).toMatchSnapshot();
  });
});
