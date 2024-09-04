import {
  Panel,
  PanelHeader,
  PanelMain,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { FunctionComponent, useEffect } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { MappingLinksContainer } from './MappingLink';
import './SourceTargetView.scss';
import { useCanvas } from '../../hooks/useCanvas';
import { SourcePanel } from './SourcePanel';
import { SourceTargetDnDHandler } from '../../providers/dnd/SourceTargetDnDHandler';
import { TargetDocument } from '../Document/TargetDocument';

export const SourceTargetView: FunctionComponent = () => {
  const { targetBodyDocument } = useDataMapper();
  const { reloadNodeReferences, setDefaultHandler } = useCanvas();

  useEffect(() => {
    setDefaultHandler(new SourceTargetDnDHandler());
  }, [setDefaultHandler]);

  return (
    <Split className="source-target-view">
      <MappingLinksContainer />
      <SplitItem className="source-target-view__source-split" isFilled>
        <SourcePanel />
      </SplitItem>
      <SplitItem className="source-target-view__line-blank" />
      <SplitItem className="source-target-view__target-split" isFilled>
        <Panel id="panel-target" variant="bordered" isScrollable className="source-target-view__target-panel">
          <PanelHeader>
            <TextContent>
              <Text component={TextVariants.h3}>Target</Text>
            </TextContent>
          </PanelHeader>
          <PanelMain onScroll={reloadNodeReferences} className="source-target-view__target-panel-main">
            <Stack className="source-target-view__target-panel-main">
              <StackItem>
                <TargetDocument document={targetBodyDocument} />
              </StackItem>
            </Stack>
          </PanelMain>
        </Panel>
      </SplitItem>
    </Split>
  );
};
