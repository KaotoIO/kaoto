import './ParameterInput.scss';

import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { forwardRef } from 'react';

type ValidationState = 'default' | 'success' | 'error';

type ParameterInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  validated?: ValidationState;
  id?: string;
  'data-testid'?: string;
};

export const ParameterInput = forwardRef<HTMLInputElement, ParameterInputProps>(
  ({ value, onChange, placeholder, validated = 'default', id, 'data-testid': dataTestId }, ref) => {
    return (
      <div className="parameter-input__wrapper">
        <input
          ref={ref}
          id={id}
          data-testid={dataTestId}
          type="text"
          className={`parameter-input__field parameter-input__field--${validated}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        {validated === 'success' && (
          <div className="parameter-input__icon parameter-input__icon--success">
            <CheckCircleIcon />
          </div>
        )}
        {validated === 'error' && (
          <div className="parameter-input__icon parameter-input__icon--error">
            <ExclamationCircleIcon />
          </div>
        )}
      </div>
    );
  },
);

ParameterInput.displayName = 'ParameterInput';
