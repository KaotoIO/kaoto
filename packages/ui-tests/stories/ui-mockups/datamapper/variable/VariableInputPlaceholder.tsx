import './VariableMockup.scss';

import { ActionList, ActionListGroup, ActionListItem, Button } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react';

interface VariableInputPlaceholderProps {
  initialName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

const VALID_NAME = /^[a-zA-Z_][a-zA-Z0-9_.-]*$/;

export const VariableInputPlaceholder: FunctionComponent<VariableInputPlaceholderProps> = ({
  initialName = '',
  onConfirm,
  onCancel,
}) => {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (initialName !== '') {
      inputRef.current?.select();
    }
  }, []);

  const validation: 'default' | 'success' | 'error' = useMemo(() => {
    if (name === '') return 'default';
    return VALID_NAME.test(name) ? 'success' : 'error';
  }, [name]);

  const errorMessage = useMemo(() => {
    if (validation === 'error') {
      return `Invalid name '${name}': must start with a letter or underscore, followed by letters, digits, underscores, dots or hyphens`;
    }
    return undefined;
  }, [validation, name]);

  return (
    <div className="variable-input-placeholder">
      <div className="variable-input-placeholder__row">
        <ActionList>
          <ActionListGroup>
            <ActionListItem>
              <input
                ref={inputRef}
                className={`variable-input-placeholder__input variable-input-placeholder__input--${validation}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="variable name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && validation === 'success') onConfirm(name);
                  if (e.key === 'Escape') onCancel();
                }}
              />
            </ActionListItem>
          </ActionListGroup>
          <ActionListGroup>
            <ActionListItem>
              <Button
                icon={<CheckIcon />}
                variant="link"
                isDisabled={validation !== 'success'}
                onClick={() => onConfirm(name)}
                aria-label="Confirm variable name"
                data-testid="variable-name-confirm-btn"
              />
            </ActionListItem>
            <ActionListItem>
              <Button
                icon={<TimesIcon />}
                variant="plain"
                onClick={onCancel}
                aria-label="Cancel"
                data-testid="variable-name-cancel-btn"
              />
            </ActionListItem>
          </ActionListGroup>
        </ActionList>
      </div>
      {errorMessage && <div className="variable-input-placeholder__error">{errorMessage}</div>}
    </div>
  );
};
