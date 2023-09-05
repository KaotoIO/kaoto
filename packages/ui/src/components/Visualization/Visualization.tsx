import { FunctionComponent, PropsWithChildren } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { BaseVisualCamelEntity } from '../../models/camel-entities';
import { Canvas } from './Canvas';
import './Visualization.scss';

interface CanvasProps {
  className?: string;
  entities: BaseVisualCamelEntity[];
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  return (
    <div className={`canvasSurface ${props.className ?? ''}`}>
      <ReactFlowProvider>
        <Canvas entities={props.entities} />
      </ReactFlowProvider>
    </div>
  );
};
