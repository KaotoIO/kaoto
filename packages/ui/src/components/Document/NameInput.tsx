import './NameInput.scss';

import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { forwardRef, KeyboardEventHandler } from 'react';

import { NameValidationStatus } from '../../models/datamapper/visualization';

const VALIDATION_CSS_CLASS: Record<NameValidationStatus, string> = {
  [NameValidationStatus.EMPTY]: 'default',
  [NameValidationStatus.SUCCESS]: 'success',
  [NameValidationStatus.ERROR]: 'error',
};

type NameInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  validated?: NameValidationStatus;
  id?: string;
  'data-testid'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
};

export const NameInput = forwardRef<HTMLInputElement, NameInputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      validated = NameValidationStatus.EMPTY,
      id,
      'data-testid': dataTestId,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      onKeyDown,
    },
    ref,
  ) => {
    const cssClass = VALIDATION_CSS_CLASS[validated];

    return (
      <div className="name-input__wrapper">
        <input
          ref={ref}
          id={id}
          data-testid={dataTestId}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          type="text"
          className={`name-input__field name-input__field--${cssClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
        {validated === NameValidationStatus.SUCCESS && (
          <div className="name-input__icon name-input__icon--success">
            <CheckCircleIcon />
          </div>
        )}
        {validated === NameValidationStatus.ERROR && (
          <div className="name-input__icon name-input__icon--error">
            <ExclamationCircleIcon />
          </div>
        )}
      </div>
    );
  },
);

NameInput.displayName = 'NameInput';
