import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Stack,
  StackItem,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useDataMapper } from '../../hooks/useDataMapper';
import { useToggle } from '../../hooks/useToggle';
import { CheckIcon, PlusIcon, TimesIcon } from '@patternfly/react-icons';
import { DocumentDefinition, DocumentDefinitionType } from '../../models/datamapper/document';
import { useCanvas } from '../../hooks/useCanvas';
import { NodeContainer } from './NodeContainer';
import { NodeReference } from '../../providers/datamapper-canvas.provider';
import { DocumentType } from '../../models/datamapper/path';
import { SourceDocument } from './SourceDocument';
import './Document.scss';

type AddNewParameterPlaceholderProps = {
  onComplete: () => void;
};

const AddNewParameterPlaceholder: FunctionComponent<AddNewParameterPlaceholderProps> = ({ onComplete }) => {
  const { sourceParameterMap, updateDocumentDefinition } = useDataMapper();
  const [newParameterName, setNewParameterName] = useState<string>('');

  const submitNewParameter = useCallback(() => {
    if (!sourceParameterMap.has(newParameterName)) {
      const definition = new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, newParameterName);
      updateDocumentDefinition(definition);
    }
    setNewParameterName('');
    onComplete();
  }, [sourceParameterMap, newParameterName, onComplete, updateDocumentDefinition]);

  const cancelNewParameter = useCallback(() => {
    setNewParameterName('');
    onComplete();
  }, [onComplete]);

  const isNewParameterNameValid = useMemo(() => {
    return newParameterName !== '' && !sourceParameterMap.has(newParameterName);
  }, [newParameterName, sourceParameterMap]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <ActionList className="parameter-actions">
      <ActionListGroup>
        <ActionListItem>
          <TextInput
            ref={inputRef}
            id="new-parameter-name"
            data-testid="add-new-parameter-name-input"
            onChange={(_event, text) => setNewParameterName(text)}
            placeholder="parameter name"
          />
        </ActionListItem>
      </ActionListGroup>
      <ActionListGroup>
        <ActionListItem>
          <Button
            onClick={() => submitNewParameter()}
            variant="link"
            isDisabled={!isNewParameterNameValid}
            id="add-new-parameter-submit-btn"
            data-testid="add-new-parameter-submit-btn"
            aria-label="Submit new parameter"
          >
            <CheckIcon />
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button
            onClick={() => cancelNewParameter()}
            variant="plain"
            id="add-new-parameter-cancel-btn"
            data-testid="add-new-parameter-cancel-btn"
            aria-label={'Cancel new parameter'}
          >
            <TimesIcon />
          </Button>
        </ActionListItem>
      </ActionListGroup>
    </ActionList>
  );
};

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
  const nodeReference = useRef<NodeReference>({ headerRef: null, containerRef: null });
  const headerRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(nodeReference, () => ({
    get headerRef() {
      return headerRef.current;
    },
    get containerRef() {
      return headerRef.current;
    },
  }));
  const nodeRefId = 'param';
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
            <Tooltip position={'auto'} enableFlip={true} content={<div>Add a parameter</div>}>
              <Button
                variant="plain"
                aria-label="Add parameter"
                data-testid={`add-parameter-button`}
                onClick={() => handleAddNewParameter()}
              >
                <PlusIcon />
              </Button>
            </Tooltip>
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
                <AddNewParameterPlaceholder onComplete={() => toggleOffAddNewParameter()} />
              </StackItem>
            )}
            {Array.from(sourceParameterMap.entries()).map(([documentId, doc]) => (
              <StackItem key={documentId}>
                <SourceDocument document={doc} isReadOnly={isReadOnly} />
              </StackItem>
            ))}
          </Stack>
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
