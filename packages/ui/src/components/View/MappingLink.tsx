import { curveMonotoneX } from '@visx/curve';
import { Circle, LinePath } from '@visx/shape';
import { CSSProperties, FunctionComponent, useCallback, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';

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
  const lineStyle: CSSProperties = {
    stroke: isSelected ? 'var(--pf-t--global--border--color--brand--default)' : 'gray',
    strokeWidth: isOver ? 6 : 3,
    pointerEvents: 'auto' as CSSProperties['pointerEvents'],
  };
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

  return (
    <>
      <Circle r={dotRadius} cx={x1} cy={y1} />
      <LinePath<[number, number]>
        data={[
          [x1, y1],
          [canvasLeft ? canvasLeft : x1, y1],
          [canvasRight ? canvasRight : x2, y2],
          [x2, y2],
        ]}
        x={(d) => d[0]}
        y={(d) => d[1]}
        curve={curveMonotoneX}
        style={lineStyle}
        onClick={onLineClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-testid={`mapping-link-${isSelected ? 'selected-' : ''}${x1}-${y1}-${x2}-${y2}`}
        xlinkTitle={`Source: ${sourceNodePath}, Target: ${targetNodePath}`}
      />
      <Circle r={dotRadius} cx={x2} cy={y2} />
    </>
  );
};
