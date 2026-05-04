import './Canvas.scss';

import { TopologyView } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactNode } from 'react';

import { VisualizationEmptyState } from '../EmptyState';

interface EmptyCanvasProps {
  entitiesNumber: number;
  contextToolbar?: ReactNode;
  isModelResolving?: boolean;
}

export const EmptyCanvas: FunctionComponent<PropsWithChildren<EmptyCanvasProps>> = ({
  entitiesNumber,
  contextToolbar,
  isModelResolving,
}) => {
  if (isModelResolving) {
    return null;
  }

  return (
    <TopologyView contextToolbar={contextToolbar}>
      <VisualizationEmptyState
        className="canvas-empty-state"
        data-testid="visualization-empty-state"
        entitiesNumber={entitiesNumber}
      />
    </TopologyView>
  );
};
