import './Canvas.scss';

import { TopologyView, WithContextMenuProps } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';

import { withNodeContextMenu } from '../Custom/ContextMenu/withNodeContextMenu';
import { CanvasBackgroundMenu } from '../Custom/Graph/CustomGraph';
import { VisualizationEmptyState } from '../EmptyState';
import { CanvasDefaults } from './canvas.defaults';
import { useCanvasFocusTarget } from './canvas-focus-handoff';

interface EmptyCanvasProps {
  entitiesNumber: number;
  contextToolbar?: ReactNode;
  isModelResolving?: boolean;
}

const EmptyCanvasView: FunctionComponent<PropsWithChildren<EmptyCanvasProps & WithContextMenuProps>> = ({
  entitiesNumber,
  contextToolbar,
  isModelResolving,
  onContextMenu,
}) => {
  const canvasRef = useCanvasFocusTarget(!isModelResolving);
  if (isModelResolving) {
    return null;
  }

  return (
    <TopologyView
      ref={canvasRef}
      onContextMenu={onContextMenu}
      id={CanvasDefaults.CANVAS_MAIN_ID}
      tabIndex={0}
      role="region"
      aria-label="Route canvas"
      contextToolbar={contextToolbar}
    >
      <VisualizationEmptyState
        className="canvas-empty-state"
        data-testid="visualization-empty-state"
        entitiesNumber={entitiesNumber}
      />
    </TopologyView>
  );
};

export const EmptyCanvas = withNodeContextMenu(() => [<CanvasBackgroundMenu key="empty-menu" />], {
  canvasBackground: true,
})(EmptyCanvasView);
