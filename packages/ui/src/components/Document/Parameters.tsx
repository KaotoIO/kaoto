import {
  ActionList,
  ActionListItem,
  Button,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useToggle } from '../../hooks/useToggle';
import { NodeReference } from '../../models/datamapper';
import './Document.scss';
import { NodeContainer } from './NodeContainer';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';
import { ParameterDocument } from './ParameterDocument';

type ParametersProps = {
  isReadOnly: boolean;
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
    <Card
      id="card-source-parameters"
      isCompact
      isPlain
      isExpanded={isSourceParametersExpanded}
      className="parameter-card"
    >
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
        <CardBody>
          <Stack>
            {isAddingNewParameter && (
              <StackItem>
                <ParameterInputPlaceholder onComplete={() => toggleOffAddNewParameter()} />
              </StackItem>
            )}
            {Array.from(sourceParameterMap.entries()).map(([documentId, doc]) => (
              <StackItem key={documentId}>
                <ParameterDocument document={doc} isReadOnly={isReadOnly} />
              </StackItem>
            ))}
          </Stack>
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
