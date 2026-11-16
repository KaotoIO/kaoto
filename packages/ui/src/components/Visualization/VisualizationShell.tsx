import './Visualization.scss';

import { FunctionComponent, PropsWithChildren, ReactNode, useRef } from 'react';

import { ErrorBoundary } from '../ErrorBoundary';
import { CanvasFallback } from './CanvasFallback';
import { useCanvasFocusRescue } from './use-canvas-focus-rescue';

interface VisualizationShellProps {
  className?: string;
  fallback?: ReactNode;
}

export const VisualizationShell: FunctionComponent<PropsWithChildren<VisualizationShellProps>> = ({
  className,
  fallback,
  children,
}) => {
  const surfaceRef = useRef<HTMLDivElement>(null);
  useCanvasFocusRescue(surfaceRef);

  return (
    <div ref={surfaceRef} className={`canvas-surface ${className ?? ''}`}>
      <ErrorBoundary fallback={fallback ?? <CanvasFallback />}>{children}</ErrorBoundary>
    </div>
  );
};
