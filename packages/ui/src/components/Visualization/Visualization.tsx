import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactNode, useMemo } from 'react';
import { BaseVisualCamelEntity } from '../../models/visualization/base-visual-entity';
import { CanvasFormTabsProvider } from '../../providers';
import { ErrorBoundary } from '../ErrorBoundary';
import { Canvas } from './Canvas';
import { ControllerService } from './Canvas/controller.service';
import { CanvasFallback } from './CanvasFallback';
import { ContextToolbar } from './ContextToolbar/ContextToolbar';
import './Visualization.scss';

interface CanvasProps {
  className?: string;
  entities: BaseVisualCamelEntity[];
  fallback?: ReactNode;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <VisualizationProvider controller={controller}>
      <div className={`canvas-surface ${props.className ?? ''}`}>
        <CanvasFormTabsProvider>
          <ErrorBoundary fallback={props.fallback ?? <CanvasFallback />}>
            <Canvas contextToolbar={<ContextToolbar />} entities={props.entities} />
          </ErrorBoundary>
        </CanvasFormTabsProvider>
      </div>
    </VisualizationProvider>
  );
};
