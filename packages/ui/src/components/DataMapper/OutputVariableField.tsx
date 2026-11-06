import './OutputVariableField.scss';

import { CheckmarkFilled } from '@carbon/icons-react';
import { TextInput } from '@carbon/react';
import { FieldWrapper } from '@kaoto/forms';
import { type ChangeEvent, FunctionComponent, useCallback } from 'react';

import { DataMapperStepService } from '../../services/datamapper-step.service';

interface OutputVariableFieldProps {
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

const INPUT_ID = 'output-variable-name';

const getValidated = (value: string): 'default' | 'success' | 'error' => {
  if (value === '') return 'default';
  return DataMapperStepService.isValidOutputVariableName(value) ? 'success' : 'error';
};

/**
 * Optional name of the Camel variable that receives a copy of the DataMapper output.
 *
 * Shared by the DataMapper launcher, which persists every change immediately, and the DataMapper settings modal,
 * which buffers changes until Save. An empty value means that no variable is configured, while a valid name is
 * highlighted with the success state so the configured state is visible at a glance.
 */
export const OutputVariableField: FunctionComponent<OutputVariableFieldProps> = ({ value, onChange, isDisabled }) => {
  const error = DataMapperStepService.getOutputVariableNameError(value);
  const isSuccess = getValidated(value) === 'success';

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <div className={`output-variable-field${isSuccess ? ' output-variable-field--success' : ''}`}>
      <FieldWrapper
        propName="save-as-variable"
        title="Save as variable"
        description="Copy the DataMapper step output to a variable in addition to the body. When this is left empty, the DataMapper step output is delivered as a message body only."
        defaultValue=""
      >
        <TextInput
          id={INPUT_ID}
          data-testid="output-variable-name-input"
          labelText="Save as variable"
          hideLabel
          value={value}
          placeholder="Variable name"
          disabled={isDisabled}
          onChange={handleChange}
          invalid={!!error}
          invalidText={error ? <span data-testid="output-variable-name-error">{error}</span> : undefined}
          decorator={isSuccess ? <CheckmarkFilled className="output-variable-field__success-icon" /> : undefined}
        />
      </FieldWrapper>
    </div>
  );
};
