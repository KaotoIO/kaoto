import {
  CSSProperties,
  FunctionComponent,
  MouseEvent,
  MouseEventHandler,
  MutableRefObject,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Accordion, Page, PageSection, Split, SplitItem } from '@patternfly/react-core';
import { DocumentField } from './DocumentField';
import { doc } from './data';

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
  const sourceRect = sourceRef.current?.getBoundingClientRect();
  const targetRect = targetRef.current?.getBoundingClientRect();

  const [coords, setCoords] = useState<LineCoords>(undefined);
  const [isOver, setIsOver] = useState<boolean>(false);

  const lineStyle = {
    stroke: 'gray',
    strokeWidth: isOver ? 6 : 3,
  };

  useEffect(() => {
    if (sourceRect && targetRect) {
      setCoords({
        x1: sourceRect.right,
        y1: sourceRect.top + (sourceRect.bottom - sourceRect.top) / 2,
        x2: targetRect.left,
        y2: targetRect.top + (targetRect.bottom - targetRect.top) / 2,
      });
    }
  }, [sourceRect, targetRect]);

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
        {!!coords && (
          <path
            onClick={() => alert('boom')}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            d={`M${coords.x1},${coords.y1},${coords.x2},${coords.y2}`}
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
              <DocumentField ref={sourceRef} onToggle={onRefresh} field={doc} initialExpanded={true}></DocumentField>
            </Accordion>
          </SplitItem>
          <SplitItem isFilled></SplitItem>
          <SplitItem isFilled>
            <Accordion isBordered={true} asDefinitionList={false} onClick={onRefresh}>
              <DocumentField ref={targetRef} onToggle={onRefresh} field={doc} initialExpanded={true}></DocumentField>
            </Accordion>
          </SplitItem>
        </Split>
      </PageSection>
    </Page>
  );
};
