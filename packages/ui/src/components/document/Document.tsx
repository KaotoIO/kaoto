import { FunctionComponent, useCallback, useMemo, useState } from 'react';
import {
  Accordion,
  ActionList,
  ActionListItem,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { IDocument, DocumentType, PrimitiveDocument } from '../../models';
import { DocumentField } from './DocumentField';
import { useCanvas } from '../../hooks/useCanvas';
import { AttachSchemaButton } from './AttachSchemaButton';
import { DetachSchemaButton } from './DetachSchemaButton';
import { DeleteParameterButton } from './DeleteParameterButton';

export type DocumentProps = {
  documentType: DocumentType;
  model: IDocument;
};

export const Document: FunctionComponent<DocumentProps> = ({ documentType, model }) => {
  const { reloadFieldReferences } = useCanvas();
  const [isExpanded, setExpanded] = useState<boolean>(true);
  const handleOnToggle = useCallback(() => {
    reloadFieldReferences();
  }, [reloadFieldReferences]);
  const handleOnExpand = useCallback(() => {
    setExpanded(!isExpanded);
    reloadFieldReferences();
  }, [isExpanded, reloadFieldReferences]);

  const primitiveDocumentHeaderActiopns = useMemo(() => {
    return (
      <ActionList isIconList={true}>
        <ActionListItem>
          <AttachSchemaButton documentType={documentType} documentId={model.documentId}></AttachSchemaButton>
        </ActionListItem>
        {documentType === DocumentType.PARAM && (
          <ActionListItem>
            <DeleteParameterButton parameterName={model.documentId} />
          </ActionListItem>
        )}
      </ActionList>
    );
  }, [documentType, model.documentId]);

  const structuredDocumentHeaderActions = useMemo(() => {
    return (
      <ActionList isIconList={true}>
        <ActionListItem>
          <AttachSchemaButton
            documentType={documentType}
            documentId={model.documentId}
            hasSchema={true}
          ></AttachSchemaButton>
        </ActionListItem>
        <ActionListItem>
          <DetachSchemaButton documentType={documentType} documentId={model.documentId}></DetachSchemaButton>
        </ActionListItem>
        {documentType === DocumentType.PARAM && (
          <ActionListItem>
            <DeleteParameterButton parameterName={model.documentId} />
          </ActionListItem>
        )}
      </ActionList>
    );
  }, [documentType, model]);

  return model instanceof PrimitiveDocument ? (
    <Card isPlain>
      <CardHeader actions={{ actions: primitiveDocumentHeaderActiopns, hasNoOffset: true }}>
        <CardTitle>{model.name}</CardTitle>
      </CardHeader>
    </Card>
  ) : (
    <Card isExpanded={isExpanded} isPlain>
      <CardHeader onExpand={handleOnExpand} actions={{ actions: structuredDocumentHeaderActions, hasNoOffset: true }}>
        <CardTitle>{model.name}</CardTitle>
      </CardHeader>
      <CardExpandableContent>
        <CardBody>
          <Accordion isBordered={true} asDefinitionList={false} onClick={handleOnToggle}>
            {model.fields.map((field) => (
              <DocumentField documentType={documentType} field={field} key={field.name} onToggle={handleOnToggle} />
            ))}
          </Accordion>
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
