import { forwardRef, FunctionComponent, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
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
import { IDocument, DocumentType, PrimitiveDocument } from '../../../models/document';
import { SourceDocumentField } from './SourceDocumentField';
import { useCanvas } from '../../../hooks/useCanvas';
import { AttachSchemaButton } from '../AttachSchemaButton';
import { DetachSchemaButton } from '../DetachSchemaButton';
import { DeleteParameterButton } from '../DeleteParameterButton';
import { NodeContainer } from '../NodeContainer';
import { NodeReference } from '../../../providers/CanvasProvider';
import '../Document.scss';
import { DocumentNodeData, FieldNodeData } from '../../../models/visualization';

type DocumentImplProps = {
  nodeData: DocumentNodeData;
};

const SourcePrimitiveDocumentImpl = forwardRef<NodeReference, DocumentImplProps>(({ nodeData }, forwardedRef) => {
  const ref = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => ({
    get headerRef() {
      return ref.current;
    },
    get containerRef() {
      return ref.current;
    },
  }));

  const headerActiopns = useMemo(() => {
    return (
      <ActionList isIconList={true}>
        <ActionListItem>
          <AttachSchemaButton
            documentType={nodeData.document.documentType}
            documentId={nodeData.document.documentId}
          ></AttachSchemaButton>
        </ActionListItem>
        {nodeData.document.documentType === DocumentType.PARAM && (
          <ActionListItem>
            <DeleteParameterButton parameterName={nodeData.document.documentId} />
          </ActionListItem>
        )}
      </ActionList>
    );
  }, [nodeData.document.documentId, nodeData.document.documentType]);

  return (
    <Card id={nodeData.id} isCompact>
      <NodeContainer nodeData={nodeData} ref={ref}>
        <CardHeader actions={{ actions: headerActiopns, hasNoOffset: true }}>
          <CardTitle>
            <Split hasGutter>
              <SplitItem>
                <GripVerticalIcon />
              </SplitItem>
              <SplitItem>{nodeData.title}</SplitItem>
            </Split>
          </CardTitle>
        </CardHeader>
      </NodeContainer>
    </Card>
  );
});

const SourceStructuredDocumentImpl = forwardRef<NodeReference, DocumentImplProps>(({ nodeData }, forwardedRef) => {
  const { reloadNodeReferences } = useCanvas();
  const [isExpanded, setExpanded] = useState<boolean>(true);

  const handleOnToggle = useCallback(() => {
    reloadNodeReferences();
  }, [reloadNodeReferences]);
  const handleOnExpand = useCallback(() => {
    setExpanded(!isExpanded);
    reloadNodeReferences();
  }, [isExpanded, reloadNodeReferences]);

  const headerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => ({
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return headerRef.current;
    },
  }));

  const hasChildren = nodeData.document.fields.length > 0;

  const headerActions = useMemo(() => {
    return (
      <ActionList isIconList={true}>
        <ActionListItem>
          <AttachSchemaButton
            documentType={nodeData.document.documentType}
            documentId={nodeData.document.documentId}
            hasSchema={true}
          ></AttachSchemaButton>
        </ActionListItem>
        <ActionListItem>
          <DetachSchemaButton
            documentType={nodeData.document.documentType}
            documentId={nodeData.document.documentId}
          ></DetachSchemaButton>
        </ActionListItem>
        {nodeData.document.documentType === DocumentType.PARAM && (
          <ActionListItem>
            <DeleteParameterButton parameterName={nodeData.document.documentId} />
          </ActionListItem>
        )}
      </ActionList>
    );
  }, [nodeData.document.documentId, nodeData.document.documentType]);

  return (
    <Card id={nodeData.id} isExpanded={isExpanded} isCompact>
      <NodeContainer ref={headerRef}>
        <CardHeader
          onExpand={hasChildren ? handleOnExpand : undefined}
          actions={{ actions: headerActions, hasNoOffset: true }}
        >
          <CardTitle>{nodeData.title}</CardTitle>
        </CardHeader>
      </NodeContainer>
      {hasChildren && (
        <CardExpandableContent>
          <CardBody>
            <Accordion togglePosition={'start'} isBordered={true} asDefinitionList={false} onClick={handleOnToggle}>
              {nodeData.document.fields.map((field) => {
                const fieldNodeData = new FieldNodeData(nodeData, field);
                return (
                  <SourceDocumentField nodeData={fieldNodeData} key={fieldNodeData.id} onToggle={handleOnToggle} />
                );
              })}
            </Accordion>
          </CardBody>
        </CardExpandableContent>
      )}
    </Card>
  );
});

export type DocumentProps = {
  model: IDocument;
};

export const SourceDocument: FunctionComponent<DocumentProps> = ({ model }) => {
  const { getNodeReference, setNodeReference } = useCanvas();
  const nodeReference = useRef<NodeReference>({ headerRef: null, containerRef: null });
  const nodeData = new DocumentNodeData(model);
  const nodeRefId = nodeData.path.toString();
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  return model instanceof PrimitiveDocument ? (
    <SourcePrimitiveDocumentImpl nodeData={nodeData} ref={nodeReference} />
  ) : (
    <SourceStructuredDocumentImpl nodeData={nodeData} ref={nodeReference} />
  );
};
