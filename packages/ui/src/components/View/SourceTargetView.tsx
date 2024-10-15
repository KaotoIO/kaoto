import {
  Divider,
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
  Truncate,
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
    <Split className="source-target-view" onScroll={reloadNodeReferences}>
      <SplitItem className="source-target-view__source-split" isFilled>
        <SourcePanel />
      </SplitItem>
      <SplitItem className="source-target-view__line-blank" />
      <SplitItem className="source-target-view__target-split" isFilled>
        <Panel id="panel-target" variant="bordered" isScrollable className="source-target-view__target-panel">
          <PanelHeader>
            <TextContent>
              <Text component={TextVariants.h3}>
                <Truncate content="Target" className="source-target-view__truncate" />
              </Text>
            </TextContent>
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
