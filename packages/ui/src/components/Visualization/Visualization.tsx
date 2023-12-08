import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';
import { BaseVisualCamelEntity } from '../../models/visualization/base-visual-entity';
import { ErrorBoundary } from '../ErrorBoundary';
import { Canvas } from './Canvas';
import { CanvasFallback } from './CanvasFallback';
import './Visualization.scss';
import { ContextToolbar } from './ContextToolbar/ContextToolbar';

interface CanvasProps {
  className?: string;
  entities: BaseVisualCamelEntity[];
  fallback?: ReactNode;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  return (
    <div className={`canvas-surface ${props.className ?? ''}`}>
      <ErrorBoundary fallback={props.fallback ?? <CanvasFallback />}>
        <Canvas contextToolbar={<ContextToolbar />} entities={props.entities} />
      </ErrorBoundary>
    </div>
  );
};
