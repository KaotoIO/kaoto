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
import { Parameters } from '../../components/document/Parameters';
import { useDataMapper } from '../../hooks';
import { useCanvas } from '../../hooks/useCanvas';
import { SourceDocument } from '../../components/document/SourceDocument';

export const SourcePanel: FunctionComponent = () => {
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
            <Parameters />
          </StackItem>
          <StackItem>&nbsp;</StackItem>
          <StackItem key={sourceBodyDocument.name}>
            <SourceDocument document={sourceBodyDocument} />
          </StackItem>
        </Stack>
      </PanelMain>
    </Panel>
  );
};
