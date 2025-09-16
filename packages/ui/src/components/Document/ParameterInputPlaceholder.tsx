import {
  AlertVariant,
  ActionList,
  ActionListGroup,
  ActionListItem,
  TextInput,
  HelperText,
  HelperTextItem,
  Button,
} from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { qname } from 'xml-name-validator';
import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentService } from '../../services/document.service';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';

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
        sendAlert({ variant: variant, title: result.validationMessage });
      } else if (!result.documentDefinition || !result.document) {
        sendAlert({ variant: AlertVariant.danger, title: 'Could not create a parameter' });
      } else {
        updateDocument(result.document, result.documentDefinition);
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
            data-testid="new-parameter-name-input"
            onChange={(_event, text) => setNewParameterName(text)}
            placeholder="parameter name"
            validated={textInputValidatedProp}
            value={newParameterName}
          />
          <HelperText data-testid="new-parameter-helper-text">
            {newParameterNameValidation === ParameterNameValidation.DUPLICATE && (
              <HelperTextItem data-testid="new-parameter-helper-text-duplicate" variant="error">
                Parameter &apos;{newParameterName}&apos; already exists
              </HelperTextItem>
            )}
            {newParameterNameValidation === ParameterNameValidation.INVALID && (
              <HelperTextItem data-testid="new-parameter-helper-text-invalid" variant="error">
                Invalid parameter name &apos;{newParameterName}&apos;: it must be a valid QName
              </HelperTextItem>
            )}
          </HelperText>
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
          ></Button>
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
  );
};
