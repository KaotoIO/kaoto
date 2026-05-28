import './MappingLink.scss';

import { curveMonotoneX } from '@visx/curve';
import { Circle, LinePath } from '@visx/shape';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useState } from 'react';

import { LineProps, MappingLineStyle } from '../../models/datamapper';
import { useDocumentTreeStore } from '../../store';

const getY = (d: number[]) => d[1];
const getX = (d: number[]) => d[0];

const COPY_OF_OFFSET = 3;

function bezierPath(sx: number, sy: number, tx: number, ty: number): string {
  const cx = (sx + tx) / 2;
  return `M ${sx} ${sy} C ${cx} ${sy} ${cx} ${ty} ${tx} ${ty}`;
}

export const MappingLink: FunctionComponent<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  sourceNodePath,
  targetNodePath,
  isSelected,
  isSourceEdge,
  isTargetEdge,
  lineStyle,
}) => {
  const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);
  const [isOver, setIsOver] = useState<boolean>(false);
  const dotRadius = isOver ? 6 : 3;

  const controlPoint1X = x1 + (x2 - x1) * 0.1;
  const controlPoint2X = x1 + (x2 - x1) * 0.9;

  const onMouseEnter = useCallback(() => setIsOver(true), []);
  const onMouseLeave = useCallback(() => setIsOver(false), []);
  const onLineClick = useCallback(() => {
    toggleSelectedNode(targetNodePath, false);
  }, [toggleSelectedNode, targetNodePath]);

  const lineClassName = clsx('mapping-link', `mapping-link--${lineStyle}`, {
    'mapping-link--selected': isSelected,
    'mapping-link--source-edge': isSourceEdge,
    'mapping-link--target-edge': isTargetEdge,
  });

  const dotClassName = clsx('mapping-link-dot', `mapping-link-dot--${lineStyle}`, {
    'mapping-link-dot--selected': isSelected,
  });

  const curveData: [number, number][] = [
    [x1, y1],
    [controlPoint1X, y1],
    [controlPoint2X, y2],
    [x2, y2],
  ];

  const interactionProps = {
    onClick: onLineClick,
    onMouseEnter,
    onMouseLeave,
  };

  const testId = `mapping-link-${isSelected ? 'selected-' : ''}${x1}-${y1}-${x2}-${y2}`;
  const isCopyOf = lineStyle === MappingLineStyle.COPY_OF;

  return (
    <>
      <Circle role="presentation" r={dotRadius} cx={x1} cy={y1} className={dotClassName} />
      {isCopyOf ? (
        <>
          <path
            d={bezierPath(x1, y1 - COPY_OF_OFFSET, x2, y2 - COPY_OF_OFFSET)}
            className={lineClassName}
            data-testid={testId}
            xlinkTitle={`Source: ${sourceNodePath}, Target: ${targetNodePath}`}
            {...interactionProps}
          />
          <path
            d={bezierPath(x1, y1 + COPY_OF_OFFSET, x2, y2 + COPY_OF_OFFSET)}
            className={lineClassName}
            {...interactionProps}
          />
        </>
      ) : (
        <LinePath<[number, number]>
          data={curveData}
          x={getX}
          y={getY}
          curve={curveMonotoneX}
          className={lineClassName}
          data-testid={testId}
          xlinkTitle={`Source: ${sourceNodePath}, Target: ${targetNodePath}`}
          {...interactionProps}
        />
      )}
      <Circle role="presentation" r={dotRadius} cx={x2} cy={y2} className={dotClassName} />
    </>
  );
};
