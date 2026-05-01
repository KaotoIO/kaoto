import './ParameterInput.scss';

import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { forwardRef } from 'react';

import { NameValidationStatus } from '../../models/datamapper/visualization';

const VALIDATION_CSS_CLASS: Record<NameValidationStatus, string> = {
  [NameValidationStatus.EMPTY]: 'default',
  [NameValidationStatus.SUCCESS]: 'success',
  [NameValidationStatus.ERROR]: 'error',
};

type ParameterInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  validated?: NameValidationStatus;
  id?: string;
  'data-testid'?: string;
};

export const ParameterInput = forwardRef<HTMLInputElement, ParameterInputProps>(
  ({ value, onChange, placeholder, validated = NameValidationStatus.EMPTY, id, 'data-testid': dataTestId }, ref) => {
    const cssClass = VALIDATION_CSS_CLASS[validated];

    return (
      <div className="parameter-input__wrapper">
        <input
          ref={ref}
          id={id}
          data-testid={dataTestId}
          type="text"
          className={`parameter-input__field parameter-input__field--${cssClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {validated === NameValidationStatus.SUCCESS && (
          <div className="parameter-input__icon parameter-input__icon--success">
            <CheckCircleIcon />
          </div>
        )}
        {validated === NameValidationStatus.ERROR && (
          <div className="parameter-input__icon parameter-input__icon--error">
            <ExclamationCircleIcon />
          </div>
        )}
      </div>
    );
  },
);

ParameterInput.displayName = 'ParameterInput';
