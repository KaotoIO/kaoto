import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { Panel, PanelMain, Stack, StackItem } from '@patternfly/react-core';
import { TargetDocument } from '../Document/TargetDocument';
import { useCanvas } from '../../hooks/useCanvas';

export const TargetPanel: FunctionComponent = () => {
  const { targetBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <Panel id="panel-target" className="source-target-view__target-panel">
      <PanelMain className="source-target-view__target-panel-main-container">
        <Stack className="source-target-view__target-panel-main" hasGutter>
          <StackItem key={targetBodyDocument.name} isFilled className="source-target-view__target-document-container">
            <TargetDocument document={targetBodyDocument} customTitle="Target Body" onScroll={reloadNodeReferences} />
          </StackItem>
        </Stack>
      </PanelMain>
    </Panel>
  );
};
