import {
  CanvasNode,
  CanvasSideBar,
  DataFormatEditor,
  IVisualizationNode,
  IVisualizationNodeData,
  NodeIconResolver,
  VisualComponentSchema,
} from '@kaoto-next/ui/testing';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';

const selectedNode: CanvasNode = {
  id: 'log-sink-6839',
  label: 'log-sink',
  parentNode: undefined,
  shape: 'ellipse',
  type: 'node',
  data: {
    vizNode: {
      children: undefined,
      data: {
        label: 'log-sink',
        path: 'sink',
        isPlaceholder: false,
        icon: NodeIconResolver.getIcon('log'),
      } as IVisualizationNodeData,
      id: 'log-sink-6839',
      nextNode: undefined,
      parentNode: undefined,
      previousNode: undefined,
      label: 'test',
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
    } as IVisualizationNode,
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
      getComponentSchema: () => {
        return {
          title: 'My Node',
          schema: null,
          definition: null,
        } as VisualComponentSchema;
      },
    } as IVisualizationNode,
  },
};

export default {
  title: 'Components/CanvasSideBar',
  component: CanvasSideBar,
} as Meta<typeof CanvasSideBar>;

const Template: StoryFn<typeof CanvasSideBar> = (args) => {
  console.log(args);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleClose = () => setIsModalOpen(!isModalOpen);
  return <CanvasSideBar {...args} onClose={handleClose} />;
};

export const ProcessorNode = Template.bind({});
ProcessorNode.args = {
  selectedNode: selectedNode,
};

export const SelectedUnknownNode = Template.bind({});
SelectedUnknownNode.args = {
  selectedNode: unknownSelectedNode,
};
