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
import { Parameters } from '../../components/document/Parameters';
import './SourceTargetView.scss';
import { useCanvas } from '../../hooks/useCanvas';

type SourceTargetViewProps = {
  isSourceOnly: boolean;
};

export const SourceTargetView: FunctionComponent<SourceTargetViewProps> = ({ isSourceOnly }) => {
  const { sourceBodyDocument, targetBodyDocument } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();

  return (
    <Split className="source-target-view">
      {!isSourceOnly && <MappingLinksContainer />}
      <SplitItem isFilled>
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
                <Document documentType={DocumentType.SOURCE_BODY} model={sourceBodyDocument} />
              </StackItem>
            </Stack>
          </PanelMain>
        </Panel>
      </SplitItem>
      {!isSourceOnly && (
        <>
          <SplitItem className="source-target-view__line-blank" isFilled>
            &nbsp;
          </SplitItem>
          <SplitItem isFilled>
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
        </>
      )}
    </Split>
  );
};
