import './Canvas.scss';

import { TopologyView, WithContextMenuProps } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';

import { useCanvasEntities } from '../../../hooks/useCanvasEntities';
import { withCanvasContextMenu } from '../Custom/ContextMenu/with-canvas-context-menu';
import { GraphContextMenuFn } from '../Custom/Graph/CustomGraph';
import { generateEntityContextMenu } from '../Custom/Graph/generateEntityContextMenu';
import { VisualizationEmptyState } from '../EmptyState';
import { CanvasDefaults } from './canvas.defaults';
import { useCanvasFocusRef } from './canvas-focus';

interface EmptyCanvasProps {
  entitiesNumber: number;
  contextToolbar?: ReactNode;
  isModelResolving?: boolean;
}

const EmptyCanvasView: FunctionComponent<PropsWithChildren<EmptyCanvasProps & WithContextMenuProps>> = ({
  entitiesNumber,
  contextToolbar,
  onContextMenu,
}) => {
  const canvasFocusRef = useCanvasFocusRef();

  return (
    <TopologyView
      ref={canvasFocusRef}
      id={CanvasDefaults.CANVAS_MAIN_ID}
      tabIndex={0}
      aria-label="Route canvas"
      contextToolbar={contextToolbar}
      onContextMenu={onContextMenu}
    >
      <VisualizationEmptyState
        className="canvas-empty-state"
        data-testid="visualization-empty-state"
        entitiesNumber={entitiesNumber}
      />
    </TopologyView>
  );
};

const EmptyCanvasMenu = () => {
  const entities = useCanvasEntities();
  return <>{GraphContextMenuFn({ entityContextMenuFn: () => generateEntityContextMenu(entities) })}</>;
};

const EmptyCanvasWithMenu = withCanvasContextMenu(() => [<EmptyCanvasMenu key="actions" />], {
  isCanvasBackground: true,
})(EmptyCanvasView);

export const EmptyCanvas: FunctionComponent<PropsWithChildren<EmptyCanvasProps>> = (props) =>
  props.isModelResolving ? null : <EmptyCanvasWithMenu {...props} />;
