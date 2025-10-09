import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import {
  Content,
  ContentVariants,
  Divider,
  Panel,
  PanelHeader,
  PanelMain,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { TargetDocument } from '../Document/TargetDocument';
import { useCanvas } from '../../hooks/useCanvas';

export const TargetPanel: FunctionComponent = () => {
  const { targetBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
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
          <StackItem key={targetBodyDocument.name}>
            <TargetDocument document={targetBodyDocument} />
          </StackItem>
        </Stack>
      </PanelMain>
    </Panel>
  );
};
