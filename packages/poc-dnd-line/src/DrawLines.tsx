import { FunctionComponent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Accordion, Page, PageSection, Split, SplitItem } from '@patternfly/react-core';
import { Caption, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { DocumentField } from './DocumentField';
import { sourceDoc, targetDoc } from './data';
import { CanvasProvider } from './canvas/CanvasProvider';
import { useCanvas } from './canvas/useCanvas';
import { PageHeader } from '@patternfly/react-core/deprecated';

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

type LineGroupProps = {
  sourceRef: MutableRefObject<HTMLDivElement>;
  targetRef: MutableRefObject<HTMLDivElement>;
};

const LineGroup: FunctionComponent<LineGroupProps> = ({ sourceRef, targetRef }) => {
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

  // sourceRef & targetRef doesn't change, while this side effect should happen on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const answer: LineCoord[] = [];
    const sourceFieldRef1 = getFieldReference(getClosestExpandedPath('SourceDocument1://field3'));
    const targetFieldRef1 = getFieldReference(getClosestExpandedPath('TargetDocument1://field1'));
    populateCoordFromFieldRef(answer, sourceFieldRef1, targetFieldRef1);
    const sourceFieldRef2 = getFieldReference(getClosestExpandedPath('SourceDocument1://field2/field1'));
    const targetFieldRef2 = getFieldReference(getClosestExpandedPath('TargetDocument1://field2/field3'));
    populateCoordFromFieldRef(answer, sourceFieldRef2, targetFieldRef2);
    setLineCoords(answer);
  }, [getFieldReference, populateCoordFromFieldRef, sourceRef, targetRef]);

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
        {!!sourceRef.current &&
          !!targetRef.current &&
          lineCoords.map((coord, index) => (
            <Line key={index} x1={coord.x1} y1={coord.y1} x2={coord.x2} y2={coord.y2} />
          ))}
      </g>
    </svg>
  );
};

export const DrawLines: FunctionComponent = () => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const { getAllFieldPaths, setFieldReference, reloadFieldReferences } = useCanvas();
  const sourcePath = sourceDoc.name + ':/';
  const targetPath = targetDoc.name + ':/';
  setFieldReference(sourcePath, sourceRef);
  setFieldReference(targetPath, targetRef);

  const onRefresh = useCallback(() => {
    reloadFieldReferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <Page>
      <PageSection>
        <Split hasGutter>
          <LineGroup sourceRef={sourceRef} targetRef={targetRef}></LineGroup>
          <SplitItem isFilled>
            <Accordion isBordered={true} asDefinitionList={false} onClick={onRefresh}>
              <DocumentField ref={sourceRef} path={sourcePath} onToggle={onRefresh} field={sourceDoc}></DocumentField>
            </Accordion>
          </SplitItem>
          <SplitItem isFilled></SplitItem>
          <SplitItem isFilled>
            <Accordion isBordered={true} asDefinitionList={false} onClick={onRefresh}>
              <DocumentField ref={targetRef} path={targetPath} onToggle={onRefresh} field={targetDoc}></DocumentField>
            </Accordion>
          </SplitItem>
        </Split>
      </PageSection>
    </Page>
  );
};
