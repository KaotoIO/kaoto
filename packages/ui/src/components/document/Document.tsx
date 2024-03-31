import { forwardRef, FunctionComponent, useCallback, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  ActionList,
  ActionListItem,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { GripVerticalIcon } from '@patternfly/react-icons';
import { IDocument, DocumentType, PrimitiveDocument } from '../../models';
import { DocumentField } from './DocumentField';
import { useCanvas } from '../../hooks/useCanvas';
import { AttachSchemaButton } from './AttachSchemaButton';
import { DetachSchemaButton } from './DetachSchemaButton';
import { DeleteParameterButton } from './DeleteParameterButton';
import { NodeContainer } from './NodeContainer';

export type DocumentProps = {
  documentType: DocumentType;
  model: IDocument;
};

type DocumentImplProps = DocumentProps & {
  nodeId: string;
};

const PrimitiveDocumentImpl = forwardRef<HTMLDivElement, DocumentImplProps>(
  ({ documentType, model, nodeId }, forwardedRef) => {
    const headerActiopns = useMemo(() => {
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

    return (
      <Card id={nodeId} isCompact>
        <NodeContainer dndId={nodeId} field={model as PrimitiveDocument} ref={forwardedRef}>
          <CardHeader actions={{ actions: headerActiopns, hasNoOffset: true }}>
            <CardTitle>
              <Split hasGutter>
                <SplitItem>
                  <GripVerticalIcon />
                </SplitItem>
                <SplitItem>{model.name}</SplitItem>
              </Split>
            </CardTitle>
          </CardHeader>
        </NodeContainer>
      </Card>
    );
  },
);

const StructuredDocumentImpl = forwardRef<HTMLDivElement, DocumentImplProps>(
  ({ documentType, model, nodeId }, forwardedRef) => {
    const { reloadNodeReferences } = useCanvas();
    const [isExpanded, setExpanded] = useState<boolean>(true);

    const handleOnToggle = useCallback(() => {
      reloadNodeReferences();
    }, [reloadNodeReferences]);
    const handleOnExpand = useCallback(() => {
      setExpanded(!isExpanded);
      reloadNodeReferences();
    }, [isExpanded, reloadNodeReferences]);

    const headerActions = useMemo(() => {
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

    return (
      <Card id={nodeId} isExpanded={isExpanded} isCompact>
        <NodeContainer ref={forwardedRef}>
          <CardHeader onExpand={handleOnExpand} actions={{ actions: headerActions, hasNoOffset: true }}>
            <CardTitle>{model.name}</CardTitle>
          </CardHeader>
        </NodeContainer>
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
  },
);

export const Document: FunctionComponent<DocumentProps> = ({ documentType, model }) => {
  const { getNodeReference, setNodeReference } = useCanvas();
  const ref = useRef<HTMLDivElement>(null);
  const fieldRefId = model.fieldIdentifier.toString();
  getNodeReference(fieldRefId) !== ref && setNodeReference(fieldRefId, ref);

  const nodeId = useMemo(() => model.documentId + '-' + Math.floor(Math.random() * 10000), [model.documentId]);

  return model instanceof PrimitiveDocument ? (
    <PrimitiveDocumentImpl documentType={documentType} model={model} nodeId={nodeId} ref={ref} />
  ) : (
    <StructuredDocumentImpl documentType={documentType} model={model} nodeId={nodeId} ref={ref} />
  );
};
