import { curveMonotoneX } from '@visx/curve';
import { Circle, LinePath } from '@visx/shape';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';
import './MappingLink.scss';

// Static functions to avoid recreation on every render
const getX = (d: [number, number]) => d[0];
const getY = (d: [number, number]) => d[1];

export const MappingLink: FunctionComponent<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  sourceNodePath,
  targetNodePath,
  isSelected = false,
  svgRef,
}) => {
  const { getNodeReference } = useCanvas();
  const { mappingLinkCanvasRef, toggleSelectedNodeReference } = useMappingLinks();
  const [isOver, setIsOver] = useState<boolean>(false);

  const lineClassName = clsx('mapping-link__line', {
    'mapping-link__line--selected': isSelected,
    'mapping-link__line--hover': isOver,
  });

  const circleClassName = clsx('mapping-link__circle', {
    'mapping-link__circle--hover': isOver,
  });

  const dotRadius = isOver ? 6 : 3;
  const svgRect = svgRef?.current?.getBoundingClientRect();
  const canvasRect = mappingLinkCanvasRef?.current?.getBoundingClientRect();
  const canvasLeft = canvasRect ? canvasRect.left - (svgRect ? svgRect.left : 0) : undefined;
  const canvasRight = canvasRect ? canvasRect.right - (svgRect ? svgRect.left : 0) : undefined;

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

  const lineData = useMemo(
    (): [number, number][] => [
      [x1, y1],
      [canvasLeft ? canvasLeft : x1, y1],
      [canvasRight ? canvasRight : x2, y2],
      [x2, y2],
    ],
    [x1, y1, x2, y2, canvasLeft, canvasRight],
  );

  return (
    <>
      <Circle className={circleClassName} r={dotRadius} cx={x1} cy={y1} />
      <LinePath<[number, number]>
        data={lineData}
        x={getX}
        y={getY}
        curve={curveMonotoneX}
        className={lineClassName}
        onClick={onLineClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-testid={`mapping-link-${isSelected ? 'selected-' : ''}${x1}-${y1}-${x2}-${y2}`}
        xlinkTitle={`Source: ${sourceNodePath}, Target: ${targetNodePath}`}
      />
      <Circle className={circleClassName} r={dotRadius} cx={x2} cy={y2} />
    </>
  );
};
