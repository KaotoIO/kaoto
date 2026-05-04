import './Visualization.scss';

import { CanvasFormTabsProvider } from '@kaoto/forms';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';

import { ErrorBoundary } from '../ErrorBoundary';
import { CanvasFallback } from './CanvasFallback';

interface VisualizationShellProps {
  className?: string;
  fallback?: ReactNode;
}

export const VisualizationShell: FunctionComponent<PropsWithChildren<VisualizationShellProps>> = ({
  className,
  fallback,
  children,
}) => {
  return (
    <div className={`canvas-surface ${className ?? ''}`}>
      <CanvasFormTabsProvider>
        <ErrorBoundary fallback={fallback ?? <CanvasFallback />}>{children}</ErrorBoundary>
      </CanvasFormTabsProvider>
    </div>
  );
};
