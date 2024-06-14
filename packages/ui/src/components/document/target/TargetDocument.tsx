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
import { IDocument, PrimitiveDocument } from '../../../models/document';
import { useCanvas } from '../../../hooks/useCanvas';
import { AttachSchemaButton } from '../AttachSchemaButton';
import { DetachSchemaButton } from '../DetachSchemaButton';
import { NodeContainer } from '../NodeContainer';
import { NodeReference } from '../../../providers/CanvasProvider';
import '../Document.scss';
import { useDataMapper } from '../../../hooks';

import { DocumentNodeData } from '../../../models/visualization';
import { TargetDocumentNode } from './TargetDocumentNode';

import { VisualizationService } from '../../../services/visualization.service';
import { TargetPrimitiveDocumentActions } from './TargetPrimitiveDocumentActions';
import { DocumentType } from '../../../models/path';

type TargetDocumentImplProps = {
  nodeData: DocumentNodeData;
};

const TargetPrimitiveDocumentImpl = forwardRef<NodeReference, TargetDocumentImplProps>(({ nodeData }, forwardedRef) => {
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
  const containerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(forwardedRef, () => ({
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return containerRef.current;
    },
  }));

  const nodeDataChildren = VisualizationService.generatePrimitiveDocumentChildren(nodeData);
  const hasChildren = nodeDataChildren.length > 0;

  const headerActiopns = useMemo(() => {
    return (
      <ActionList isIconList={true}>
        <ActionListItem>
          <AttachSchemaButton
            documentType={DocumentType.TARGET_BODY}
            documentId={nodeData.document.documentId}
          ></AttachSchemaButton>
        </ActionListItem>
      </ActionList>
    );
  }, [nodeData.document.documentId]);

  return (
    <Card id={nodeData.id} isExpanded={isExpanded} isCompact>
      <div ref={containerRef}>
        <NodeContainer nodeData={nodeData} ref={headerRef}>
          <CardHeader
            onExpand={hasChildren ? handleOnExpand : undefined}
            actions={{ actions: headerActiopns, hasNoOffset: true }}
          >
            <CardTitle>
              <Split hasGutter>
                <SplitItem>
                  <GripVerticalIcon />
                </SplitItem>
                <SplitItem>{nodeData.title}</SplitItem>
                <SplitItem>&nbsp;</SplitItem>
                <SplitItem>
                  <TargetPrimitiveDocumentActions nodeData={nodeData} />
                </SplitItem>
              </Split>
            </CardTitle>
          </CardHeader>
        </NodeContainer>
        {hasChildren && (
          <CardExpandableContent>
            <CardBody>
              <Accordion togglePosition={'start'} isBordered={true} asDefinitionList={false} onClick={handleOnToggle}>
                {nodeDataChildren.map((child) => (
                  <TargetDocumentNode nodeData={child} key={child.id} onToggle={handleOnToggle} />
                ))}
              </Accordion>
            </CardBody>
          </CardExpandableContent>
        )}
      </div>
    </Card>
  );
});

const TargetStructuredDocumentImpl = forwardRef<NodeReference, TargetDocumentImplProps>(
  ({ nodeData }, forwardedRef) => {
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

    const nodeDataChildren = VisualizationService.generateStructuredDocumentChildren(nodeData);
    const hasChildren = nodeDataChildren.length > 0;

    const headerActions = useMemo(() => {
      return (
        <ActionList isIconList={true}>
          <ActionListItem>
            <AttachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={nodeData.document.documentId}
              hasSchema={true}
            ></AttachSchemaButton>
          </ActionListItem>
          <ActionListItem>
            <DetachSchemaButton
              documentType={DocumentType.TARGET_BODY}
              documentId={nodeData.document.documentId}
            ></DetachSchemaButton>
          </ActionListItem>
        </ActionList>
      );
    }, [nodeData.document.documentId]);

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
                {nodeDataChildren.map((child) => (
                  <TargetDocumentNode nodeData={child} key={child.id} onToggle={handleOnToggle} />
                ))}
              </Accordion>
            </CardBody>
          </CardExpandableContent>
        )}
      </Card>
    );
  },
);

export type TargetDocumentProps = {
  model: IDocument;
};

export const TargetDocument: FunctionComponent<TargetDocumentProps> = ({ model }) => {
  const { getNodeReference, setNodeReference, clearNodeReferencesForDocument } = useCanvas();
  const { mappingTree } = useDataMapper();
  const nodeReference = useRef<NodeReference>({ headerRef: null, containerRef: null });
  const nodeData = new DocumentNodeData(model, mappingTree);
  const nodeRefId = nodeData.path.toString();
  clearNodeReferencesForDocument(model.documentType, model.documentId);
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  return model instanceof PrimitiveDocument ? (
    <TargetPrimitiveDocumentImpl nodeData={nodeData} ref={nodeReference} />
  ) : (
    <TargetStructuredDocumentImpl nodeData={nodeData} ref={nodeReference} />
  );
};
