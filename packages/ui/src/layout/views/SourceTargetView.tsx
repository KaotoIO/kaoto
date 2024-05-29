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
import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks';
import { Document } from '../../components/document';
import { MappingLinksContainer } from '../../components/mapping/MappingLink';
import { DocumentType } from '../../models/document';
import './SourceTargetView.scss';
import { useCanvas } from '../../hooks/useCanvas';
import { SourcePanel } from './SourcePanel';

export const SourceTargetView: FunctionComponent = () => {
  const { targetBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

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
                <Document documentType={DocumentType.TARGET_BODY} model={targetBodyDocument} />
              </StackItem>
            </Stack>
          </PanelMain>
        </Panel>
      </SplitItem>
    </Split>
  );
};
