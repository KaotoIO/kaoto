import { FunctionComponent, MutableRefObject, useCallback, useEffect, useState } from 'react';
import { useCanvas } from '../canvas/useCanvas';

type LineCoord = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type LineProps = LineCoord;

const Line: FunctionComponent<LineProps> = ({ x1, y1, x2, y2 }) => {
  const [isOver, setIsOver] = useState<boolean>(false);
  const lineStyle = {
    stroke: 'gray',
    strokeWidth: isOver ? 6 : 3,
  };

  const onMouseEnter = useCallback(() => {
    setIsOver(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  const coord = `[ x1:${x1}, y1:${y1}, x2:${x2}, y2:${y2} ]`;
  return (
    <path
      onClick={() => alert(coord)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      d={`M${x1},${y1},${x2},${y2}`}
      style={lineStyle}
    >
      <title>{coord}</title>
    </path>
  );
};

export type Mapping = {
  sourcePath: string;
  targetPath: string;
};

type LineGroupProps = {
  mappings: Mapping[];
};

export const LineGroup: FunctionComponent<LineGroupProps> = ({ mappings }) => {
  const [lineCoords, setLineCoords] = useState<LineCoord[]>([]);
  const { getFieldReference } = useCanvas();

  const populateCoordFromFieldRef = useCallback(
    (coords: LineCoord[], sourceRef: MutableRefObject<HTMLDivElement>, targetRef: MutableRefObject<HTMLDivElement>) => {
      const sourceRect = sourceRef.current?.getBoundingClientRect();
      const targetRect = targetRef.current?.getBoundingClientRect();
      if (!sourceRect || !targetRect) {
        return;
      }

      const coord = {
        x1: sourceRect.right,
        y1: sourceRect.top + (sourceRect.bottom - sourceRect.top) / 2,
        x2: targetRect.left,
        y2: targetRect.top + (targetRect.bottom - targetRect.top) / 2,
      };
      coords.push(coord);
    },
    [],
  );

  const getParentPath = useCallback((path: string) => {
    const lastSeparatorIndex = path.lastIndexOf('/');
    return lastSeparatorIndex !== -1 ? path.substring(0, lastSeparatorIndex) : null;
  }, []);

  const getClosestExpandedPath = useCallback(
    (path: string) => {
      let tracedPath = path;
      while (getFieldReference(tracedPath).current?.getClientRects().length === 0) {
        tracedPath = getParentPath(tracedPath);
      }
      return tracedPath;
    },
    [getFieldReference, getParentPath],
  );

  useEffect(() => {
    const answer: LineCoord[] = [];
    mappings.map((mapping) => {
      const sourceFieldRef1 = getFieldReference(getClosestExpandedPath(mapping.sourcePath));
      const targetFieldRef1 = getFieldReference(getClosestExpandedPath(mapping.targetPath));
      populateCoordFromFieldRef(answer, sourceFieldRef1, targetFieldRef1);
    });
    setLineCoords(answer);
  }, [getClosestExpandedPath, getFieldReference, mappings, populateCoordFromFieldRef]);

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <g>
        {lineCoords.map((coord, index) => (
          <Line key={index} x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} />
        ))}
      </g>
    </svg>
  );
};
