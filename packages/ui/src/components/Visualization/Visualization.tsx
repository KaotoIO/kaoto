import { FunctionComponent, PropsWithChildren } from 'react';
import { BaseVisualCamelEntity } from '../../models/visualization/base-visual-entity';
import { ErrorBoundary } from '../ErrorBoundary';
import { Canvas } from './Canvas';
import { CanvasFallback } from './CanvasFallback';
import './Visualization.scss';
import { ContextToolbar } from './ContextToolbar/ContextToolbar';
import { VisibleFlowsProvider } from '../../providers/visible-flows.provider';

interface CanvasProps {
  className?: string;
  entities: BaseVisualCamelEntity[];
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  return (
    <div className={`canvas-surface ${props.className ?? ''}`}>
      <ErrorBoundary fallback={<CanvasFallback />}>
        <VisibleFlowsProvider>
          <Canvas contextToolbar={<ContextToolbar />} entities={props.entities} />
        </VisibleFlowsProvider>
      </ErrorBoundary>
    </div>
  );
};
