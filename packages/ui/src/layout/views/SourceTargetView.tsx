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
import { useDataMapperContext } from '../../hooks';
import { Document } from '../../components/document';
import { ImportDocumentButton } from '../../components/document';

export const SourceTargetView: FunctionComponent = () => {
  const { sourceDocuments, targetDocuments } = useDataMapperContext();
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
    <Split hasGutter>
      <SplitItem isFilled>
        <Card id="card-source">
          <CardHeader actions={{ actions: sourceDocumentsActions }}>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack hasGutter>
              {sourceDocuments.map((doc) => (
                <StackItem key={doc.name}>
                  <Document model={doc} />
                </StackItem>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </SplitItem>
      <SplitItem>draw lines here</SplitItem>
      <SplitItem isFilled>
        <Card id="card-target">
          <CardHeader actions={{ actions: targetDocumentActions }}>
            <CardTitle>Target</CardTitle>
          </CardHeader>
          <CardBody>
            <Stack hasGutter>
              {targetDocuments.map((doc) => (
                <StackItem key={doc.name}>
                  <Document model={doc} />
                </StackItem>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </SplitItem>
    </Split>
  );
};
