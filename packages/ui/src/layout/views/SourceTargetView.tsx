import {
  ActionList,
  ActionListItem,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { FunctionComponent } from 'react';
import { useDataMapper } from '../../hooks';
import { Document } from '../../components/document';
import { ImportDocumentButton } from '../../components/document';
import { MappingLinksContainer } from '../../components/mapping/MappingLink';
import { DocumentType } from '../../models/document';

export const SourceTargetView: FunctionComponent = () => {
  const { sourceDocuments, targetDocuments } = useDataMapper();
  const sourceDocumentsActions = (
    <ActionList>
      <ActionListItem>
        <ImportDocumentButton isSource={true} />
      </ActionListItem>
    </ActionList>
  );
  const targetDocumentActions = (
    <ActionList>
      <ActionListItem>
        <ImportDocumentButton isSource={false} />
      </ActionListItem>
    </ActionList>
  );

  return (
    <Split>
      <MappingLinksContainer />
      <SplitItem isFilled>
        <Card id="card-source" isCompact>
          <CardHeader actions={{ actions: sourceDocumentsActions }}>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack hasGutter>
              {sourceDocuments.map((doc) => (
                <StackItem key={doc.name}>
                  <Document documentType={DocumentType.SOURCE_BODY} model={doc} />
                </StackItem>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </SplitItem>
      <SplitItem isFilled>&nbsp;</SplitItem>
      <SplitItem isFilled>
        <Card id="card-target" isCompact>
          <CardHeader actions={{ actions: targetDocumentActions }}>
            <CardTitle>Target</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack hasGutter>
              {targetDocuments.map((doc) => (
                <StackItem key={doc.name}>
                  <Document documentType={DocumentType.TARGET_BODY} model={doc} />
                </StackItem>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </SplitItem>
    </Split>
  );
};
