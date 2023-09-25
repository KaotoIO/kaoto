import { render } from '@testing-library/react';
import { VisualizationNode } from '../../../models/visualization';
import { VisualComponentSchema } from '../../../models/visualization/base-visual-entity';
import { CanvasForm } from './CanvasForm';
import { CanvasNode } from './canvas.models';
import { JSONSchemaType } from 'ajv';

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
        } as VisualizationNode,
      },
    };

    const { container } = render(<CanvasForm selectedNode={selectedNode} />);

    expect(container).toMatchSnapshot();
  });

  it('should render nothing if no schema is available', () => {
    const selectedNode: CanvasNode = {
      id: '1',
      type: 'node',
      data: {
        vizNode: {
          getComponentSchema: () => undefined,
        } as VisualizationNode,
      },
    };

    const { container } = render(<CanvasForm selectedNode={selectedNode} />);

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
        } as VisualizationNode,
      },
    };

    const { container } = render(<CanvasForm selectedNode={selectedNode} />);

    expect(container).toMatchSnapshot();
  });
});
