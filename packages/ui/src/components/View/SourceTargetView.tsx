import {
  Content,
  ContentVariants,
  Divider,
  Panel,
  PanelHeader,
  PanelMain,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { FunctionComponent, useEffect, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useMappingLinks } from '../../hooks/useMappingLinks';
import { SourceTargetDnDHandler } from '../../providers/dnd/SourceTargetDnDHandler';
import { TargetDocument } from '../Document/TargetDocument';
import { MappingLinksContainer } from './MappingLinkContainer';
import { SourcePanel } from './SourcePanel';
import './SourceTargetView.scss';

export const SourceTargetView: FunctionComponent = () => {
  const { targetBodyDocument } = useDataMapper();
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
        <Panel id="panel-target" variant="bordered" isScrollable className="source-target-view__target-panel">
          <PanelHeader>
            <Content>
              <Content component={ContentVariants.h3}>
                <span className="source-target-view__truncate">Target</span>
              </Content>
            </Content>
          </PanelHeader>
          <PanelMain onScroll={reloadNodeReferences} className="source-target-view__target-panel-main">
            <Stack className="source-target-view__target-panel-main">
              <StackItem>
                <Divider component="div" inset={{ default: 'insetSm' }} className="source-target-view__divider" />
              </StackItem>
              <StackItem>
                <TargetDocument document={targetBodyDocument} />
              </StackItem>
            </Stack>
          </PanelMain>
        </Panel>
      </SplitItem>
      <MappingLinksContainer />
    </Split>
  );
};
