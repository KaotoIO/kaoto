import {
  CamelRouteVisualEntity,
  CanvasNode,
  CanvasSideBar,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeIconResolver,
  NodeIconType,
  VisibleFlowsProvider,
  VisualComponentSchema,
  camelRouteJson,
} from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

const selectedNode: CanvasNode = {
  id: 'log-sink-6839',
  label: 'log-sink',
  parentNode: undefined,
  shape: 'rect',
  type: 'node',
  data: {
    vizNode: {
      children: undefined,
      data: {
        label: 'log-sink',
        path: 'sink',
        isPlaceholder: false,
        icon: NodeIconResolver.getIcon('log', NodeIconType.EIP),
      } as IVisualizationNodeData,
      id: 'log-sink-6839',
      nextNode: undefined,
      parentNode: undefined,
      previousNode: undefined,
      label: 'test',
      getId: () => 'log-sink-6839',
      getOmitFormFields: () => [],
      getComponentSchema: () => {
        return {
          title: 'My Node',
          schema: {
            type: 'object',
            properties: {
              Uri: {
                type: 'string',
              },
              Name: {
                type: 'string',
              },
              Pattern: {
                enum: ['InOnly', 'InOut'],
                type: undefined,
              },
            },
            required: ['Uri'],
          },
          definition: {
            name: 'my node',
          },
        } as VisualComponentSchema;
      },
      getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson),
    } as unknown as IVisualizationNode,
  },
};

const unknownSelectedNode: CanvasNode = {
  id: '1',
  type: 'node',
  label: 'test',
  data: {
    vizNode: {
      data: {
        id: 'test',
        label: 'test',
        icon: NodeIconResolver.getIcon(''),
      } as IVisualizationNodeData,
      getId: () => 'test',
      getOmitFormFields: () => [],
      getComponentSchema: () => {
        return {
          title: 'My Node',
          schema: null,
          definition: null,
        } as VisualComponentSchema;
      },
      getBaseEntity: () => new CamelRouteVisualEntity(camelRouteJson),
    } as unknown as IVisualizationNode,
  },
};

export default {
  title: 'Canvas/CanvasSideBar',
  component: CanvasSideBar,
} as Meta<typeof CanvasSideBar>;

const Template: StoryFn<typeof CanvasSideBar> = (args) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleClose = () => setIsModalOpen(!isModalOpen);
  return (
    <VisibleFlowsProvider>
      <CanvasSideBar {...args} onClose={handleClose} />
    </VisibleFlowsProvider>
  );
};

export const ProcessorNode = Template.bind({});
ProcessorNode.args = {
  selectedNode,
};

export const SelectedUnknownNode = Template.bind({});
SelectedUnknownNode.args = {
  selectedNode: unknownSelectedNode,
};
