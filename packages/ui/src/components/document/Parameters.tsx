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
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataMapper, useToggle } from '../../hooks';
import { CheckIcon, PlusIcon, TimesIcon } from '@patternfly/react-icons';
import { DocumentType, PrimitiveDocument } from '../../models/document';
import { Document } from './Document';

type AddNewParameterPlaceholderProps = {
  onComplete: () => void;
};

const AddNewParameterPlaceholder: FunctionComponent<AddNewParameterPlaceholderProps> = ({ onComplete }) => {
  const { sourceParameterMap, refreshSourceParameters } = useDataMapper();
  const [newParameterName, setNewParameterName] = useState<string>('');

  const submitNewParameter = useCallback(() => {
    if (!sourceParameterMap.has(newParameterName)) {
      const primitiveDocument = new PrimitiveDocument(DocumentType.PARAM, newParameterName);
      sourceParameterMap.set(newParameterName, primitiveDocument);
      refreshSourceParameters();
    }
    setNewParameterName('');
    onComplete();
  }, [sourceParameterMap, newParameterName, onComplete, refreshSourceParameters]);

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
    <ActionList>
      <ActionListItem>
        <TextInput
          ref={inputRef}
          id="new-parameter-name"
          onChange={(_event, text) => setNewParameterName(text)}
          placeholder="parameter name"
        />
      </ActionListItem>
      <ActionListItem>
        <Button
          onClick={() => submitNewParameter()}
          variant="link"
          isDisabled={!isNewParameterNameValid}
          id="add-new-parameter-submit-btn"
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
          aria-label={'Cancel new parameter'}
        >
          <TimesIcon />
        </Button>
      </ActionListItem>
    </ActionList>
  );
};

export const Parameters: FunctionComponent = () => {
  const { sourceParameterMap } = useDataMapper();
  const [isSourceParametersExpanded, setSourceParametersExpanded] = useState<boolean>(false);
  const {
    state: isAddingNewParameter,
    toggleOff: toggleOffAddNewParameter,
    toggleOn: toggleOnAddNewParameter,
  } = useToggle(false);

  const handleAddNewParameter = useCallback(() => {
    setSourceParametersExpanded(true);
    toggleOnAddNewParameter();
  }, [toggleOnAddNewParameter]);

  const parametersHeaderActions = useMemo(() => {
    return (
      <ActionList isIconList={true}>
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
      </ActionList>
    );
  }, [handleAddNewParameter]);

  return (
    <Card id="card-source-parameters" isPlain isExpanded={isSourceParametersExpanded}>
      <CardHeader
        onExpand={() => setSourceParametersExpanded(!isSourceParametersExpanded)}
        actions={{ actions: parametersHeaderActions, hasNoOffset: true }}
      >
        <CardTitle>Parameters</CardTitle>
      </CardHeader>
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
                <Document documentType={DocumentType.PARAM} model={doc} />
              </StackItem>
            ))}
          </Stack>
        </CardBody>
      </CardExpandableContent>
    </Card>
  );
};
