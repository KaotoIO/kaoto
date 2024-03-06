import { FunctionComponent, MutableRefObject, useCallback, useEffect, useRef, useState } from 'react';
import { Accordion, Page, PageSection, Split, SplitItem } from '@patternfly/react-core';
import { DocumentField } from './DocumentField';
import { sourceDoc, targetDoc } from './data';

type LinesProps = {
  sourceRef: MutableRefObject<HTMLDivElement>;
  targetRef: MutableRefObject<HTMLDivElement>;
  token?: number;
};

type LineCoords = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

const Lines: FunctionComponent<LinesProps> = ({ sourceRef, targetRef }) => {
  const [x1, setX1] = useState<number>(0);
  const [y1, setY1] = useState<number>(0);
  const [x2, setX2] = useState<number>(0);
  const [y2, setY2] = useState<number>(0);
  const [isOver, setIsOver] = useState<boolean>(false);

  const lineStyle = {
    stroke: 'gray',
    strokeWidth: isOver ? 6 : 3,
  };

  // sourceRef & targetRef doesn't change, while this side effect should happen on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const sourceRect = sourceRef.current?.getBoundingClientRect();
    const targetRect = targetRef.current?.getBoundingClientRect();

    if (sourceRect && targetRect) {
      setX1(sourceRect.right);
      setY1(sourceRect.top + (sourceRect.bottom - sourceRect.top) / 2);
      setX2(targetRect.left);
      setY2(targetRect.top + (targetRect.bottom - targetRect.top) / 2);
    }
  });

  const onMouseEnter = () => {
    setIsOver(true);
  };
  const onMouseLeave = () => {
    setIsOver(false);
  };

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
        {!!sourceRef.current && !!targetRef.current && (
          <path
            onClick={() => alert('boom')}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            d={`M${x1},${y1},${x2},${y2}`}
            style={lineStyle}
          />
        )}
      </g>
    </svg>
  );
};

export const DrawLines: FunctionComponent = () => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState<number>(0);

  const onRefresh = useCallback(() => {
    setToken(Math.random());
  }, []);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <Page>
      <PageSection>
        <Split hasGutter>
          <Lines token={token} sourceRef={sourceRef} targetRef={targetRef}></Lines>
          <SplitItem isFilled>
            <Accordion isBordered={true} asDefinitionList={false} onClick={onRefresh}>
              <DocumentField
                ref={sourceRef}
                onToggle={onRefresh}
                field={sourceDoc}
                initialExpanded={true}
              ></DocumentField>
            </Accordion>
          </SplitItem>
          <SplitItem isFilled></SplitItem>
          <SplitItem isFilled>
            <Accordion isBordered={true} asDefinitionList={false} onClick={onRefresh}>
              <DocumentField
                ref={targetRef}
                onToggle={onRefresh}
                field={targetDoc}
                initialExpanded={true}
              ></DocumentField>
            </Accordion>
          </SplitItem>
        </Split>
      </PageSection>
    </Page>
  );
};
