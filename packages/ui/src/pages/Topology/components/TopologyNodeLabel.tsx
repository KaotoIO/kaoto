import { FunctionComponent } from 'react';

import { CanvasDefaults } from '../../../components/Visualization/Canvas/canvas.defaults';

interface TopologyNodeLabelProps {
  label: string;
  /** Width of the node (used to center the label horizontally). */
  nodeWidth: number;
  /** Height of the node (used to position the label below it). */
  nodeHeight: number;
}

/**
 * Renders the label below a topology node — positioned identically to the
 * design canvas labels so the route group, external endpoint and dynamic
 * endpoint share a consistent look.
 */
export const TopologyNodeLabel: FunctionComponent<TopologyNodeLabelProps> = ({ label, nodeWidth, nodeHeight }) => {
  if (!label) {
    return null;
  }

  const labelX = (nodeWidth - CanvasDefaults.DEFAULT_LABEL_WIDTH) / 2;

  return (
    <foreignObject
      className="custom-node__label"
      x={labelX}
      y={nodeHeight - 1}
      width={CanvasDefaults.DEFAULT_LABEL_WIDTH}
      height={CanvasDefaults.DEFAULT_LABEL_HEIGHT}
    >
      <div className="custom-node__label__text">
        <span title={label}>{label}</span>
      </div>
    </foreignObject>
  );
};
