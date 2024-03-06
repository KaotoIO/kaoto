import {
  GridLayout,
  ComponentFactory,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  EdgeModel,
  Graph,
  GraphComponent,
  Layout,
  LayoutFactory,
  Model,
  ModelKind,
  Node,
  NodeModel,
  NodeShape,
  SELECTION_EVENT,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
} from '@patternfly/react-topology';
import { FunctionComponent, ReactNode, useCallback, useMemo, useState } from 'react';
import { Page, ToolbarItem } from '@patternfly/react-core';
import { sourceDoc } from './data';

const baselineLayoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
  return new GridLayout(graph, {
    groupDistance: 0,
    collideDistance: 0,
  });
};

const baselineComponentFactory: ComponentFactory = (kind: ModelKind, type: string): ReturnType<ComponentFactory> => {
  switch (type) {
    case 'group':
      return CustomGroup as ReturnType<ComponentFactory>;
    default:
      switch (kind) {
        case ModelKind.graph:
          return GraphComponent;
        case ModelKind.node:
          return CustomNode as ReturnType<ComponentFactory>;
        case ModelKind.edge:
          return DefaultEdge;
        default:
          throw Error(`Unsupported type/kind: ${type}/${kind}`);
      }
  }
};

const NODE_SHAPE = NodeShape.rect;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 75;

interface FieldNodeModel extends NodeModel {}

const EDGES: EdgeModel[] = [];

interface CustomNodeProps {
  element: Node;
}

const CustomNode: FunctionComponent<CustomNodeProps> = ({ element }) => {
  return <DefaultNode element={element}></DefaultNode>;
};

interface CustomGroupProps {
  element: Node;
}

const CustomGroup: FunctionComponent<CustomGroupProps> = ({ element }) => {
  return <DefaultGroup collapsible hulledOutline={false} element={element}></DefaultGroup>;
};

export const ReactTopologyTest: FunctionComponent = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const populateChildrenFromField = useCallback(
    (field: any, nodes: FieldNodeModel[], parentPath: string): FieldNodeModel => {
      const path = parentPath + '/' + field.name;
      const childNodes = [];
      if (field.fields && field.fields.length !== 0) {
        for (const child of field.fields) {
          childNodes.push(populateChildrenFromField(child, nodes, path));
        }
        nodes.push(...childNodes);
      }
      return {
        id: path,
        group: childNodes.length > 0,
        type: childNodes.length > 0 ? 'group' : 'node',
        children: childNodes.length > 0 ? childNodes.map((n) => n.id) : undefined,
        label: field.name,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        shape: NODE_SHAPE,
      };
    },
    [],
  );

  const documentNodes: FieldNodeModel[] = useMemo(() => {
    const answer: FieldNodeModel[] = [];
    const source = populateChildrenFromField(sourceDoc, answer, 'Source:/');
    const target = populateChildrenFromField(sourceDoc, answer, 'Target:/');
    answer.push(source, target);
    return answer;
  }, [populateChildrenFromField]);

  const controller = useMemo(() => {
    const model: Model = {
      nodes: documentNodes,
      edges: EDGES,
      graph: {
        id: 'g1',
        type: 'graph',
        layout: 'Grid',
      },
    };

    const newController = new Visualization();
    newController.registerLayoutFactory(baselineLayoutFactory);
    newController.registerComponentFactory(baselineComponentFactory);

    newController.addEventListener(SELECTION_EVENT, setSelectedIds);

    newController.fromModel(model, false);

    return newController;
  }, [documentNodes]);

  const contextToolbar = <ToolbarItem></ToolbarItem>;
  return (
    <Page>
      <TopologyView viewToolbar={contextToolbar}>
        <VisualizationProvider controller={controller}>
          <VisualizationSurface state={{ selectedIds }} />
        </VisualizationProvider>
      </TopologyView>
    </Page>
  );
};
