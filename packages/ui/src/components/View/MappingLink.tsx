import './MappingLink.scss';

import { curveMonotoneX } from '@visx/curve';
import { Circle, LinePath } from '@visx/shape';
import clsx from 'clsx';
import { FunctionComponent, useCallback, useState } from 'react';

import { useMappingLinks } from '../../hooks/useMappingLinks';
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
  isSelected = false,
  isPartial = false,
  svgRef,
}) => {
  const { mappingLinkCanvasRef } = useMappingLinks();
  const toggleSelectedNode = useDocumentTreeStore((state) => state.toggleSelectedNode);
  const [isOver, setIsOver] = useState<boolean>(false);
  const dotRadius = isOver ? 6 : 3;
  const svgRect = svgRef?.current?.getBoundingClientRect();
  const canvasRect = mappingLinkCanvasRef?.current?.getBoundingClientRect();
  const svgRectLeft = svgRect?.left ?? 0;
  const canvasLeft = canvasRect ? canvasRect.left - svgRectLeft : undefined;
  const canvasRight = canvasRect ? canvasRect.right - svgRectLeft : undefined;

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

  return (
    <>
      <Circle role="presentation" r={dotRadius} cx={x1} cy={y1} />
      <LinePath<[number, number]>
        data={[
          [x1, y1],
          [canvasLeft ?? x1, y1],
          [canvasRight ?? x2, y2],
          [x2, y2],
        ]}
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
