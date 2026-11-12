import './Visualization.scss';

import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';

import { ErrorBoundary } from '../ErrorBoundary';
import { CanvasFocusProvider } from './Canvas/canvas-focus-handoff';
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
    <CanvasFocusProvider>
      <div className={`canvas-surface ${className ?? ''}`}>
        <ErrorBoundary fallback={fallback ?? <CanvasFallback />}>{children}</ErrorBoundary>
      </div>
    </CanvasFocusProvider>
  );
};
