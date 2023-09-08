import { FunctionComponent, PropsWithChildren } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { BaseVisualCamelEntity } from '../../models/camel-entities';
import { ErrorBoundary } from '../ErrorBoundary';
import { Canvas } from './Canvas';
import { CanvasFallback } from './CanvasFallback';
import './Visualization.scss';

interface CanvasProps {
  className?: string;
  entities: BaseVisualCamelEntity[];
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  return (
    <div className={`canvasSurface ${props.className ?? ''}`}>
      <ErrorBoundary fallback={<CanvasFallback />}>
        <ReactFlowProvider>
          <Canvas entities={props.entities} />
        </ReactFlowProvider>
      </ErrorBoundary>
    </div>
  );
};
