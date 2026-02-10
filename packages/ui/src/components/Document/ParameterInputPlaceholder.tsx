import { ActionList, ActionListGroup, ActionListItem, AlertVariant, Button } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { qname } from 'xml-name-validator';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { DocumentService } from '../../services/document.service';
import { ParameterInput } from './ParameterInput';

enum ParameterNameValidation {
  EMPTY,
  OK,
  DUPLICATE,
  INVALID,
}

type ParameterInputPlaceholderProps = {
  onComplete: () => void;
  parameter?: string;
};

export const ParameterInputPlaceholder: FunctionComponent<ParameterInputPlaceholderProps> = ({
  onComplete,
  parameter,
}) => {
  const { sendAlert, sourceParameterMap, renameSourceParameter, updateDocument } = useDataMapper();
  const [newParameterName, setNewParameterName] = useState<string>(parameter ?? '');

  const onSubmitParameter = useCallback(() => {
    if (parameter && parameter !== newParameterName) {
      // renaming existing parameter
      renameSourceParameter(parameter, newParameterName);
    } else if (!sourceParameterMap.has(newParameterName)) {
      const result = DocumentService.createPrimitiveDocument(
        DocumentType.PARAM,
        DocumentDefinitionType.Primitive,
        newParameterName,
      );

      if (result.validationStatus !== 'success') {
        const variant = result.validationStatus === 'warning' ? AlertVariant.warning : AlertVariant.danger;
        const messages = result.errors ?? result.warnings ?? [];
        sendAlert({ variant: variant, title: messages.join('; ') });
      } else if (!result.documentDefinition || !result.document) {
        sendAlert({ variant: AlertVariant.danger, title: 'Could not create a parameter' });
      } else {
        updateDocument(result.document, result.documentDefinition, newParameterName);
      }
    }

    setNewParameterName('');
    onComplete();
  }, [parameter, sourceParameterMap, newParameterName, onComplete, renameSourceParameter, sendAlert, updateDocument]);

  const cancelNewParameter = useCallback(() => {
    setNewParameterName('');
    onComplete();
  }, [onComplete]);

  const newParameterNameValidation: ParameterNameValidation = useMemo(() => {
    if (newParameterName === '') return ParameterNameValidation.EMPTY;
    if (!parameter && sourceParameterMap.has(newParameterName)) return ParameterNameValidation.DUPLICATE;
    if (!qname(newParameterName)) return ParameterNameValidation.INVALID;
    return ParameterNameValidation.OK;
  }, [newParameterName, parameter, sourceParameterMap]);

  const textInputValidatedProp = useMemo(() => {
    switch (newParameterNameValidation) {
      case ParameterNameValidation.OK:
        return 'success';
      case ParameterNameValidation.EMPTY:
        return 'default';
      case ParameterNameValidation.DUPLICATE:
      case ParameterNameValidation.INVALID:
        return 'error';
    }
  }, [newParameterNameValidation]);

  const errorMessage = useMemo(() => {
    if (newParameterNameValidation === ParameterNameValidation.DUPLICATE) {
      return `Parameter '${newParameterName}' already exists`;
    }
    if (newParameterNameValidation === ParameterNameValidation.INVALID) {
      return `Invalid parameter name '${newParameterName}': it must be a valid QName`;
    }
    return undefined;
  }, [newParameterNameValidation, newParameterName]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <>
      <ActionList className="parameter-actions">
        <ActionListGroup>
          <ActionListItem>
            <ParameterInput
              ref={inputRef}
              id="new-parameter-name"
              data-testid="new-parameter-name-input"
              value={newParameterName}
              onChange={setNewParameterName}
              placeholder="parameter name"
              validated={textInputValidatedProp}
            />
          </ActionListItem>
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button
              icon={<CheckIcon />}
              onClick={() => onSubmitParameter()}
              variant="link"
              isDisabled={newParameterNameValidation !== ParameterNameValidation.OK}
              id="new-parameter-submit-btn"
              data-testid="new-parameter-submit-btn"
              aria-label="Submit new parameter"
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              icon={<TimesIcon />}
              onClick={() => cancelNewParameter()}
              variant="plain"
              id="new-parameter-cancel-btn"
              data-testid="new-parameter-cancel-btn"
              aria-label={'Cancel new parameter'}
            />
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
      <div className="parameter-input-error" data-testid="new-parameter-name-input-error">
        {textInputValidatedProp === 'error' && errorMessage}
      </div>
    </>
  );
};
