import {
  Content,
  ContentVariants,
  Divider,
  Panel,
  PanelHeader,
  PanelMain,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { Parameters } from '../Document/Parameters';
import { SourceDocument } from '../Document/SourceDocument';
import './SourceTargetView.scss';

type SourcePanelProps = {
  isReadOnly?: boolean;
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false }) => {
  const { sourceBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <Panel id="panel-source" variant="bordered" isScrollable className="source-target-view__source-panel">
      <PanelHeader>
        <Content>
          <Content component={ContentVariants.h3}>
            <Truncate content="Source" className="source-target-view__truncate" />
          </Content>
        </Content>
      </PanelHeader>
      <PanelMain onScroll={reloadNodeReferences} maxHeight="90%">
        <Stack className="source-target-view__source-panel-main">
          <StackItem>
            <Divider component="div" inset={{ default: 'insetSm' }} className="source-target-view__divider" />
          </StackItem>
          <StackItem>
            <Parameters isReadOnly={isReadOnly} />
          </StackItem>
          <StackItem>
            <Divider component="div" inset={{ default: 'insetSm' }} className="source-target-view__divider" />
          </StackItem>
          <StackItem key={sourceBodyDocument.name} isFilled>
            <SourceDocument document={sourceBodyDocument} isReadOnly={isReadOnly} />
          </StackItem>
        </Stack>
      </PanelMain>
    </Panel>
  );
};
