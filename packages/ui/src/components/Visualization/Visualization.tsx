import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';
import { BaseVisualCamelEntity } from '../../models/visualization/base-visual-entity';
import { CanvasFormTabsProvider } from '../../providers';
import { ErrorBoundary } from '../ErrorBoundary';
import { Canvas } from './Canvas';
import { CanvasFallback } from './CanvasFallback';
import { ContextToolbar } from './ContextToolbar/ContextToolbar';
import './Visualization.scss';

interface CanvasProps {
  className?: string;
  entities: BaseVisualCamelEntity[];
  fallback?: ReactNode;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  return (
    <div className={`canvas-surface ${props.className ?? ''}`}>
      <CanvasFormTabsProvider>
        <ErrorBoundary fallback={props.fallback ?? <CanvasFallback />}>
          <Canvas contextToolbar={<ContextToolbar />} entities={props.entities} />
        </ErrorBoundary>
      </CanvasFormTabsProvider>
    </div>
  );
};
