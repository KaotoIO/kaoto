import { CSSProperties, FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { Circle, LinePath } from '@visx/shape';
import { curveMonotoneX } from '@visx/curve';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { LineProps } from '../../models/datamapper';
import { MappingLinksService } from '../../services/mapping-links.service';

const MappingLink: FunctionComponent<LineProps> = ({
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

  // Calculate canvas points for clipped lines
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

export const MappingLinksContainer: FunctionComponent = () => {
  const [lineCoordList, setLineCoordList] = useState<LineProps[]>([]);
  const { getNodeReference } = useCanvas();
  const { getMappingLinks, mappingLinkCanvasRef } = useMappingLinks();
  const svgRef = useRef<SVGSVGElement>(null);

  const refreshLinks = useCallback(() => {
    const links = getMappingLinks();
    const answer = MappingLinksService.calculateMappingLinkCoordinates(
      links,
      svgRef,
      getNodeReference,
      mappingLinkCanvasRef,
    );
    setLineCoordList(answer);
  }, [getMappingLinks, getNodeReference, mappingLinkCanvasRef]);

  useEffect(() => {
    refreshLinks();
    window.addEventListener('resize', refreshLinks);
    window.addEventListener('scroll', refreshLinks);
    return () => {
      window.removeEventListener('resize', refreshLinks);
      window.removeEventListener('scroll', refreshLinks);
    };
  }, [refreshLinks]);

  return (
    <svg
      ref={svgRef}
      data-testid="mapping-links"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <g z={0}>
        {lineCoordList.map((lineProps, index) => (
          <MappingLink
            key={index}
            svgRef={svgRef}
            x1={lineProps.x1}
            y1={lineProps.y1}
            x2={lineProps.x2}
            y2={lineProps.y2}
            sourceNodePath={lineProps.sourceNodePath}
            targetNodePath={lineProps.targetNodePath}
            isSelected={lineProps.isSelected}
            clipDirection={lineProps.clipDirection}
            clippedEnd={lineProps.clippedEnd}
          />
        ))}
      </g>
    </svg>
  );
};
