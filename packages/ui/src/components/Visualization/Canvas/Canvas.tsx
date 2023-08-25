import { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, Edge, Node, useReactFlow } from 'reactflow';
import 'reactflow/dist/style.css';
import { CamelRoute } from '../../../models/camel-entities';
import { CanvasService } from './canvas.service';

interface CanvasProps {
  contextToolbar?: React.ReactNode;
  entities: CamelRoute[];
}

export const Canvas: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  /** Calculate graph */
  useEffect(() => {
    if (!Array.isArray(props.entities)) return;

    const localNodes: Node[] = [];
    const localEdges: Edge[] = [];

    props.entities.forEach((entity) => {
      const { nodes: childNodes, edges: childEdges } = CanvasService.getFlowChart(entity.toVizNode());
      localNodes.push(...childNodes);
      localEdges.push(...childEdges);
    });

    setNodes(localNodes);
    setEdges(localEdges);

    /** Find a better mechanism to update the canvas */
    setTimeout(() => {
      fitView();
    }, 100);
  }, []);

  return (
    <ReactFlow nodes={nodes} edges={edges}>
      <Background />
      <Controls />
    </ReactFlow>
  );
};
