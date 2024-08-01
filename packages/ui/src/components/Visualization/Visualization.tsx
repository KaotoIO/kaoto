import { FunctionComponent, PropsWithChildren, ReactNode, useMemo } from 'react';
import { BaseVisualCamelEntity } from '../../models/visualization/base-visual-entity';
import { ErrorBoundary } from '../ErrorBoundary';
import { Canvas } from './Canvas';
import { CanvasFallback } from './CanvasFallback';
import './Visualization.scss';
import { ContextToolbar } from './ContextToolbar/ContextToolbar';
import { CanvasFormTabsProvider } from '../../providers';

interface CanvasProps {
  className?: string;
  entities: BaseVisualCamelEntity[];
  fallback?: ReactNode;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const lastUpdate = useMemo(() => Date.now(), [props.entities]);

  return (
    <div className={`canvas-surface ${props.className ?? ''}`}>
      <ErrorBoundary key={lastUpdate} fallback={props.fallback ?? <CanvasFallback />}>
        <CanvasFormTabsProvider>
          <Canvas contextToolbar={<ContextToolbar />} entities={props.entities} />
        </CanvasFormTabsProvider>
      </ErrorBoundary>
    </div>
  );
};
