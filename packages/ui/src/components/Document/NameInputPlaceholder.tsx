import './NameInputPlaceholder.scss';

import { ActionList, ActionListGroup, ActionListItem, Button, Label } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { NameValidation, NameValidationStatus } from '../../models/datamapper/visualization';
import { NameInput } from './NameInput';

type NameInputPlaceholderProps = {
  initialName?: string;
  validate: (name: string) => NameValidation;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  placeholder: string;
  testIdPrefix: string;
  ariaLabelPrefix: string;
  label?: string;
};

export const NameInputPlaceholder: FunctionComponent<NameInputPlaceholderProps> = ({
  initialName,
  validate,
  onSubmit,
  onCancel,
  placeholder,
  testIdPrefix,
  ariaLabelPrefix,
  label,
}) => {
  const [name, setName] = useState<string>(initialName ?? '');

  const validation = useMemo(() => validate(name), [name, validate]);

  const isValid = validation.status === NameValidationStatus.SUCCESS;

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    onSubmit(name);
  }, [isValid, name, onSubmit]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' && isValid) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [isValid, handleSubmit],
  );

  const handleEscapeKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (initialName) {
      input.select();
    }
  }, [initialName]);

  return (
    <>
      <ActionList className="name-input-actions" onKeyDown={handleEscapeKeyDown}>
        <ActionListGroup>
          <ActionListItem>
            {label && <Label>{label}</Label>}
            <NameInput
              ref={inputRef}
              id={`${testIdPrefix}-name`}
              data-testid={`${testIdPrefix}-name-input`}
              aria-label={ariaLabelPrefix}
              value={name}
              onChange={setName}
              placeholder={placeholder}
              validated={validation.status}
              onKeyDown={handleInputKeyDown}
            />
          </ActionListItem>
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button
              icon={<CheckIcon />}
              onClick={(event) => {
                // Keep the click from reaching an enclosing panel summary,
                // which would otherwise toggle it while confirming.
                event.stopPropagation();
                handleSubmit();
              }}
              variant="link"
              isDisabled={!isValid}
              id={`${testIdPrefix}-submit-btn`}
              data-testid={`${testIdPrefix}-submit-btn`}
              aria-label={`Submit ${ariaLabelPrefix}`}
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              icon={<TimesIcon />}
              onClick={(event) => {
                event.stopPropagation();
                onCancel();
              }}
              variant="plain"
              id={`${testIdPrefix}-cancel-btn`}
              data-testid={`${testIdPrefix}-cancel-btn`}
              aria-label={`Cancel ${ariaLabelPrefix}`}
            />
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
      <div className="name-input-error" data-testid={`${testIdPrefix}-name-input-error`}>
        {validation.error}
      </div>
    </>
  );
};
