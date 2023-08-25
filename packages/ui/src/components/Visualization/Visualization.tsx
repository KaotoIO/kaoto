import { FunctionComponent, PropsWithChildren, useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { CamelRoute } from '../../models/camel-entities';
import { camelRoute } from '../../stubs/camel-route';
import { Canvas } from './Canvas';
import './Visualization.scss';

interface CanvasProps {
  className?: string;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const [entities] = useState<CamelRoute[]>([camelRoute]);

  return (
    <div className={`canvasSurface ${props.className ?? ''}`}>
      <ReactFlowProvider>
        <Canvas entities={entities} />
      </ReactFlowProvider>
    </div>
  );
};
