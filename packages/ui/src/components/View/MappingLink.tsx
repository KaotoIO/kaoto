import { curveMonotoneX } from '@visx/curve';
import { Circle, LinePath } from '@visx/shape';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';
import './MappingLink.scss';

const getY = (d: number[]) => d[1];
const getX = (d: number[]) => d[0];

export const MappingLink: FunctionComponent<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  sourceNodePath,
  targetNodePath,
  isSelected = false,
  clipDirection = 'none',
  clippedEnd,
  svgRef,
}) => {
  const { getNodeReference } = useCanvas();
  const { mappingLinkCanvasRef, toggleSelectedNodeReference } = useMappingLinks();
  const [isOver, setIsOver] = useState<boolean>(false);
  const dotRadius = isOver ? 6 : 3;
  const svgRect = svgRef?.current?.getBoundingClientRect();
  const canvasRect = mappingLinkCanvasRef?.current?.getBoundingClientRect();
  const canvasLeft = canvasRect ? canvasRect.left - (svgRect ? svgRect.left : 0) : undefined;
  const canvasRight = canvasRect ? canvasRect.right - (svgRect ? svgRect.left : 0) : undefined;

  const canvas25Percent = canvasRect && svgRect ? canvasRect.left + canvasRect.width * 0.25 - svgRect.left : undefined;
  const canvas75Percent = canvasRect && svgRect ? canvasRect.left + canvasRect.width * 0.75 - svgRect.left : undefined;

  const onMouseEnter = useCallback(() => {
    setIsOver(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  const onLineClick = useCallback(() => {
    const newRef = getNodeReference(targetNodePath);
    toggleSelectedNodeReference(newRef);
  }, [getNodeReference, targetNodePath, toggleSelectedNodeReference]);

  return (
    <>
      {clipDirection === 'none' || clippedEnd !== 'source' ? <Circle r={dotRadius} cx={x1} cy={y1} /> : null}

      <Circle role="presentation" r={dotRadius} cx={x1} cy={y1} />
      <LinePath<[number, number]>
        data={
          clipDirection !== 'none'
            ? clippedEnd === 'both'
              ? [
                  // Case 5: Both not visible - straight line top to bottom
                  [x1, y1],
                  [x2, y2],
                ]
              : clippedEnd === 'target' && canvas25Percent
                ? [
                    // Cases 1,2: Source visible, target clipped - curve to top/bottom center
                    [x1, y1],
                    [canvas25Percent, y1],
                    [x2, y2],
                  ]
                : clippedEnd === 'source' && canvas75Percent
                  ? [
                      // Cases 3,4: Source clipped, target visible - curve from top/bottom center
                      [x1, y1],
                      [canvas75Percent, y2],
                      [x2, y2],
                    ]
                  : [
                      // Fallback for clipped lines
                      [x1, y1],
                      [x2, y2],
                    ]
            : [
                // Case 6: Normal lines - existing behavior
                [x1, y1],
                [canvasLeft ? canvasLeft : x1, y1],
                [canvasRight ? canvasRight : x2, y2],
                [x2, y2],
              ]
        }
        x={getX}
        y={getY}
        curve={curveMonotoneX}
        className={clsx('mapping-link', {
          'mapping-link--selected': isSelected,
        })}
        onClick={onLineClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-testid={`mapping-link-${isSelected ? 'selected-' : ''}${x1}-${y1}-${x2}-${y2}`}
        xlinkTitle={`Source: ${sourceNodePath}, Target: ${targetNodePath}`}
      />

      {clipDirection !== 'none' ? (
        clippedEnd === 'both' ? (
          // Case 5: Both ends clipped - show arrows at both ends
          <>
            <polygon
              points={`${x1 - 6},${y1 + 6} ${x1 + 6},${y1 + 6} ${x1},${y1 - 6}`}
              fill={isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'gray'}
              style={{ pointerEvents: 'none' }}
            />
            <polygon
              points={`${x2 - 6},${y2 - 6} ${x2 + 6},${y2 - 6} ${x2},${y2 + 6}`}
              fill={isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'gray'}
              style={{ pointerEvents: 'none' }}
            />
          </>
        ) : clippedEnd === 'source' ? (
          // Source clipped - arrow at source end
          <>
            {clipDirection === 'down' ? (
              <polygon
                points={`${x1 - 6},${y1 - 6} ${x1 + 6},${y1 - 6} ${x1},${y1 + 6}`}
                fill={isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'gray'}
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              <polygon
                points={`${x1 - 6},${y1 + 6} ${x1 + 6},${y1 + 6} ${x1},${y1 - 6}`}
                fill={isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'gray'}
                style={{ pointerEvents: 'none' }}
              />
            )}
            <Circle r={dotRadius} cx={x2} cy={y2} />
          </>
        ) : (
          // Target clipped - arrow at target end
          <>
            <Circle r={dotRadius} cx={x1} cy={y1} />
            {clipDirection === 'down' ? (
              <polygon
                points={`${x2 - 6},${y2 - 6} ${x2 + 6},${y2 - 6} ${x2},${y2 + 6}`}
                fill={isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'gray'}
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              <polygon
                points={`${x2 - 6},${y2 + 6} ${x2 + 6},${y2 + 6} ${x2},${y2 - 6}`}
                fill={isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'gray'}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </>
        )
      ) : (
        <Circle r={dotRadius} cx={x2} cy={y2} />
      )}
    </>
  );
};
