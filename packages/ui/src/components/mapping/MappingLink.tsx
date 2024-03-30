import { FunctionComponent, MutableRefObject, useCallback, useEffect, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { IMapping } from '../../models';
import { useDataMapper } from '../../hooks';

type LineCoord = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type LineProps = LineCoord & {
  mapping: IMapping;
};

const MappingLink: FunctionComponent<LineProps> = ({ x1, y1, x2, y2, mapping }) => {
  const { selectedMapping, setSelectedMapping } = useDataMapper();
  const [isOver, setIsOver] = useState<boolean>(false);
  const lineStyle = {
    stroke: mapping === selectedMapping ? 'blue' : 'gray',
    strokeWidth: isOver ? 6 : 3,
  };

  const onMouseEnter = useCallback(() => {
    setIsOver(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  return (
    <path
      onClick={() => setSelectedMapping(mapping)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      d={`M${x1},${y1},${x2},${y2}`}
      style={lineStyle}
    >
      <title>
        Source: {JSON.stringify(mapping.sourceFields.map((f) => f.fieldIdentifier))}, Target:{' '}
        {JSON.stringify(mapping.targetFields.map((f) => f.fieldIdentifier))}
      </title>
    </path>
  );
};

type MappingLinksContainerProps = {
  lineRefreshToken: string;
};

export const MappingLinksContainer: FunctionComponent<MappingLinksContainerProps> = ({ lineRefreshToken }) => {
  const { mappings, selectedMapping } = useDataMapper();
  const [linePropsList, setLinePropsList] = useState<LineProps[]>([]);
  const { getFieldReference } = useCanvas();

  const populateCoordFromFieldRef = useCallback(
    (
      coords: LineProps[],
      mapping: IMapping,
      sourceRef: MutableRefObject<HTMLDivElement | null>,
      targetRef: MutableRefObject<HTMLDivElement | null>,
    ) => {
      const sourceRect = sourceRef.current?.getBoundingClientRect();
      const targetRect = targetRef.current?.getBoundingClientRect();
      if (!sourceRect || !targetRect) {
        return;
      }

      const lineProps = {
        x1: sourceRect.right,
        y1: sourceRect.top + (sourceRect.bottom - sourceRect.top) / 2,
        x2: targetRect.left,
        y2: targetRect.top + (targetRect.bottom - targetRect.top) / 2,
        mapping,
      };
      coords.push(lineProps);
    },
    [],
  );

  const getParentPath = useCallback((path: string) => {
    const lastSeparatorIndex = path.lastIndexOf('/');
    return lastSeparatorIndex !== -1 ? path.substring(0, lastSeparatorIndex) : null;
  }, []);

  const getClosestExpandedPath = useCallback(
    (path: string) => {
      let tracedPath: string | null = path;
      while (!!tracedPath && getFieldReference(tracedPath)?.current?.getClientRects().length === 0) {
        tracedPath = getParentPath(tracedPath);
      }
      return tracedPath;
    },
    [getFieldReference, getParentPath],
  );

  useEffect(() => {
    const answer: LineProps[] = mappings.reduce((acc, mapping) => {
      for (const sourceField of mapping.sourceFields) {
        for (const targetField of mapping.targetFields) {
          const sourceClosestPath = getClosestExpandedPath(sourceField.fieldIdentifier.toString());
          const targetClosestPath = getClosestExpandedPath(targetField.fieldIdentifier.toString());
          if (sourceClosestPath && targetClosestPath) {
            const sourceFieldRef = getFieldReference(sourceClosestPath);
            const targetFieldRef = getFieldReference(targetClosestPath);
            !!sourceFieldRef &&
              !!targetFieldRef &&
              populateCoordFromFieldRef(acc, mapping, sourceFieldRef, targetFieldRef);
          }
        }
      }
      return acc;
    }, [] as LineProps[]);
    setLinePropsList(answer);
  }, [
    lineRefreshToken,
    getClosestExpandedPath,
    getFieldReference,
    mappings,
    populateCoordFromFieldRef,
    selectedMapping,
  ]);

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
      <g z={0}>
        {linePropsList.map((lineProps, index) => (
          <MappingLink
            key={index}
            x1={lineProps.x1}
            y1={lineProps.y1}
            x2={lineProps.x2}
            y2={lineProps.y2}
            mapping={lineProps.mapping}
          />
        ))}
      </g>
    </svg>
  );
};
