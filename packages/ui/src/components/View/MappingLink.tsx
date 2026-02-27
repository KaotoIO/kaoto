import './MappingLink.scss';

import { curveMonotoneX } from '@visx/curve';
import { Circle, LinePath } from '@visx/shape';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useState } from 'react';

import { LineProps } from '../../models/datamapper';
import { useDocumentTreeStore } from '../../store';

const getY = (d: number[]) => d[1];
const getX = (d: number[]) => d[0];

export const MappingLink: FunctionComponent<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  sourceNodePath,
  targetNodePath,
  isSelected,
  isPartial,
  isSourceEdge,
  isTargetEdge,
}) => {
  const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);
  const [isOver, setIsOver] = useState<boolean>(false);
  const dotRadius = isOver ? 6 : 3;

  // Calculate control points as 10% from each end
  const controlPoint1X = x1 + (x2 - x1) * 0.1;
  const controlPoint2X = x1 + (x2 - x1) * 0.9;

  const onMouseEnter = useCallback(() => {
    setIsOver(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  const onLineClick = useCallback(() => {
    // Select the target node - this will highlight all involved nodes in the mapping
    toggleSelectedNode(targetNodePath, false);
  }, [toggleSelectedNode, targetNodePath]);

  const curveData: [number, number][] = [
    [x1, y1],
    [controlPoint1X, y1],
    [controlPoint2X, y2],
    [x2, y2],
  ];

  return (
    <>
      <Circle role="presentation" r={dotRadius} cx={x1} cy={y1} />
      <LinePath<[number, number]>
        data={curveData}
        x={getX}
        y={getY}
        curve={curveMonotoneX}
        className={clsx('mapping-link', {
          'mapping-link--selected': isSelected,
          'mapping-link--partial': isPartial,
        })}
        onClick={onLineClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-testid={`mapping-link-${isSelected ? 'selected-' : ''}${x1}-${y1}-${x2}-${y2}`}
        xlinkTitle={`Source: ${sourceNodePath}, Target: ${targetNodePath}`}
      />
      <Circle role="presentation" r={dotRadius} cx={x2} cy={y2} />
    </>
  );
};
