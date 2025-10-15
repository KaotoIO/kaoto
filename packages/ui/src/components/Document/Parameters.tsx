import {
  ActionList,
  ActionListItem,
  Button,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useToggle } from '../../hooks/useToggle';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { IDocument } from '../../models/datamapper/document';
import { NodeReference } from '../../models/datamapper';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { TreeUIService } from '../../services/tree-ui.service';
import './Document.scss';
import { NodeContainer } from './NodeContainer';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';
import { SourceDocumentNode } from './SourceDocumentNode';

type ParametersProps = {
  isReadOnly: boolean;
};

type ParameterItemProps = {
  document: IDocument;
  isReadOnly: boolean;
};

// Renders a parameter without the Card wrapper (unlike SourceDocument)
const ParameterItem: FunctionComponent<ParameterItemProps> = ({ document, isReadOnly }) => {
  const documentNodeData = useMemo(() => new DocumentNodeData(document), [document]);
  const [treeNode, setTreeNode] = useState<DocumentTree | undefined>(undefined);
  const documentId = documentNodeData.id;

  useEffect(() => {
    const tree = TreeUIService.createTree(documentNodeData);
    setTreeNode(tree);
  }, [documentNodeData]);

  if (!treeNode) {
    return null;
  }

  return <SourceDocumentNode treeNode={treeNode.root} documentId={documentId} isReadOnly={isReadOnly} rank={1} />;
};

export const Parameters: FunctionComponent<ParametersProps> = ({ isReadOnly }) => {
  const { sourceParameterMap, isSourceParametersExpanded, setSourceParametersExpanded } = useDataMapper();
  const { reloadNodeReferences } = useCanvas();
  const {
    state: isAddingNewParameter,
    toggleOff: toggleOffAddNewParameter,
    toggleOn: toggleOnAddNewParameter,
  } = useToggle(false);

  const { getNodeReference, setNodeReference } = useCanvas();
  const nodeRefId = 'param';
  const nodeReference = useRef<NodeReference>({ isSource: true, path: nodeRefId, headerRef: null, containerRef: null });
  const headerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(nodeReference, () => ({
    isSource: true,
    path: nodeRefId,
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return headerRef.current;
    },
  }));
  getNodeReference(nodeRefId) !== nodeReference && setNodeReference(nodeRefId, nodeReference);

  const handleAddNewParameter = useCallback(() => {
    setSourceParametersExpanded(true);
    toggleOnAddNewParameter();
  }, [setSourceParametersExpanded, toggleOnAddNewParameter]);

  const handleOnExpand = useCallback(() => {
    setSourceParametersExpanded(!isSourceParametersExpanded);
    reloadNodeReferences();
  }, [isSourceParametersExpanded, reloadNodeReferences, setSourceParametersExpanded]);

  const parametersHeaderActions = useMemo(() => {
    return (
      <ActionList isIconList={true} className="parameter-actions">
        {!isReadOnly && (
          <ActionListItem>
            <Button
              icon={<PlusIcon />}
              variant="plain"
              title="Add parameter"
              aria-label="Add parameter"
              data-testid="add-parameter-button"
              onClick={() => handleAddNewParameter()}
            />
          </ActionListItem>
        )}
      </ActionList>
    );
  }, [handleAddNewParameter, isReadOnly]);

  return (
    <Card id="card-source-parameters" isCompact isExpanded={isSourceParametersExpanded} className="parameter-card">
      <NodeContainer ref={headerRef}>
        <CardHeader
          data-testid="card-source-parameters-header"
          onExpand={handleOnExpand}
          actions={{ actions: parametersHeaderActions, hasNoOffset: true }}
        >
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
      </NodeContainer>
      <CardExpandableContent>
        <CardBody className="parameter-card__body">
          {isAddingNewParameter && <ParameterInputPlaceholder onComplete={() => toggleOffAddNewParameter()} />}
          {Array.from(sourceParameterMap.entries()).map(([documentId, doc]) => {
            return <ParameterItem key={documentId} document={doc} isReadOnly={isReadOnly} />;
          })}
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
