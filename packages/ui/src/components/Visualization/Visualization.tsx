import { FunctionComponent, PropsWithChildren, ReactNode, useMemo } from 'react';
import { BaseVisualCamelEntity } from '../../models/visualization/base-visual-entity';
import { CanvasFormTabsProvider } from '../../providers';
import { ErrorBoundary } from '../ErrorBoundary';
import { CanvasController } from './Canvas/CanvasController';
import { CanvasFallback } from './CanvasFallback';
import { ContextToolbar } from './ContextToolbar/ContextToolbar';
import './Visualization.scss';

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
          <CanvasController contextToolbar={<ContextToolbar />} entities={props.entities} />
        </CanvasFormTabsProvider>
      </ErrorBoundary>
    </div>
  );
};
