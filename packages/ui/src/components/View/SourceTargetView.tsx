import { Split, SplitItem } from '@patternfly/react-core';
import { FunctionComponent, useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { SourceTargetDnDHandler } from '../../providers/dnd/SourceTargetDnDHandler';
import { MappingLinksContainer } from './MappingLinkContainer';
import { SourcePanel } from './SourcePanel';
import './SourceTargetView.scss';
import { TargetPanel } from './TargetPanel';

export const SourceTargetView: FunctionComponent = () => {
  const { reloadNodeReferences, setDefaultHandler } = useCanvas();
  const { setMappingLinkCanvasRef } = useMappingLinks();
  const mappingLinkCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMappingLinkCanvasRef(mappingLinkCanvasRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDefaultHandler(new SourceTargetDnDHandler());
  }, [setDefaultHandler]);

  return (
    <Split className="source-target-view" onScroll={reloadNodeReferences}>
      <SplitItem className="source-target-view__source-split" isFilled>
        <SourcePanel />
      </SplitItem>

      <SplitItem className="source-target-view__line-blank">
        <div ref={mappingLinkCanvasRef} />
      </SplitItem>

      <SplitItem className="source-target-view__target-split" isFilled>
        <TargetPanel />
      </SplitItem>

      <MappingLinksContainer />
    </Split>
  );
};
