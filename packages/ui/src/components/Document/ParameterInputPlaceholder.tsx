import { ActionList, ActionListGroup, ActionListItem, AlertVariant, Button } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DocumentDefinitionType, DocumentType } from '../../models/datamapper/document';
import { NameValidationStatus } from '../../models/datamapper/visualization';
import { DocumentService } from '../../services/document/document.service';
import { VisualizationService } from '../../services/visualization/visualization.service';
import { ParameterInput } from './ParameterInput';

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
        sendAlert({ variant: variant, title: messages.map((m) => m.message).join('; ') });
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

  const validation = useMemo(() => {
    const paramMap = parameter ? new Map<string, never>() : sourceParameterMap;
    return VisualizationService.validateParameterName(newParameterName, paramMap);
  }, [newParameterName, parameter, sourceParameterMap]);

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
              validated={validation.status}
            />
          </ActionListItem>
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button
              icon={<CheckIcon />}
              onClick={() => onSubmitParameter()}
              variant="link"
              isDisabled={validation.status !== NameValidationStatus.SUCCESS}
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
        {validation.error}
      </div>
    </>
  );
};
