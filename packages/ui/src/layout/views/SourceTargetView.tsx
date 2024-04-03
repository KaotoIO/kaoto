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

export const SourceTargetView: FunctionComponent = () => {
  const { sourceBodyDocument, targetBodyDocument } = useDataMapper();

  return (
    <Split className="sourceTargetView">
      <MappingLinksContainer />
      <SplitItem isFilled>
        <Panel id="panel-source" variant="bordered" isScrollable className="sourcePanel">
          <PanelHeader>
            <TextContent>
              <Text component={TextVariants.h3}>Source</Text>
            </TextContent>
          </PanelHeader>
          <PanelMain maxHeight="90%">
            <Stack>
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
      <SplitItem className="lineBlank" isFilled>
        &nbsp;
      </SplitItem>
      <SplitItem isFilled>
        <Panel id="panel-target" variant="bordered" isScrollable className="targetPanel">
          <PanelHeader>
            <TextContent>
              <Text component={TextVariants.h3}>Target</Text>
            </TextContent>
          </PanelHeader>
          <PanelMain maxHeight="90%">
            <Stack>
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
