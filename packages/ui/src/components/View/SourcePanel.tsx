import { FunctionComponent } from 'react';
import {
  Panel,
  PanelHeader,
  PanelMain,
  Stack,
  StackItem,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { Parameters } from '../Document/Parameters';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useCanvas } from '../../hooks/useCanvas';
import { SourceDocument } from '../Document/SourceDocument';

type SourcePanelProps = {
  isReadOnly?: boolean;
};

export const SourcePanel: FunctionComponent<SourcePanelProps> = ({ isReadOnly = false }) => {
  const { sourceBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <Panel id="panel-source" variant="bordered" isScrollable className="source-target-view__source-panel">
      <PanelHeader>
        <TextContent>
          <Text component={TextVariants.h3}>Source</Text>
        </TextContent>
      </PanelHeader>
      <PanelMain onScroll={reloadNodeReferences} maxHeight="90%">
        <Stack className="source-target-view__source-panel-main">
          <StackItem>
            <Parameters isReadOnly={isReadOnly} />
          </StackItem>
          <StackItem>&nbsp;</StackItem>
          <StackItem key={sourceBodyDocument.name}>
            <SourceDocument document={sourceBodyDocument} isReadOnly={isReadOnly} />
          </StackItem>
        </Stack>
      </PanelMain>
    </Panel>
  );
};
