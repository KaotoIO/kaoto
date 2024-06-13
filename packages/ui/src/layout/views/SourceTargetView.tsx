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
import { useDataMapper } from '../../hooks';
import { MappingLinksContainer } from './MappingLink';
import './SourceTargetView.scss';
import { useCanvas } from '../../hooks/useCanvas';
import { SourcePanel } from './SourcePanel';
import { SourceTargetDnDHandler } from '../../providers/dnd/SourceTargetDnDHandler';
import { TargetDocument } from '../../components/document/target/TargetDocument';

export const SourceTargetView: FunctionComponent = () => {
  const { targetBodyDocument } = useDataMapper();
  const { reloadNodeReferences, setActiveHandler } = useCanvas();

  useEffect(() => {
    setActiveHandler(new SourceTargetDnDHandler());
  }, [setActiveHandler]);

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
          <PanelMain onScroll={reloadNodeReferences} maxHeight="90%">
            <Stack className="source-target-view__target-panel-main">
              <StackItem>
                <TargetDocument model={targetBodyDocument} />
              </StackItem>
            </Stack>
          </PanelMain>
        </Panel>
      </SplitItem>
    </Split>
  );
};
