import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';
import { type FormEvent, FunctionComponent, useCallback } from 'react';

import { DataMapperStepService } from '../../services/datamapper-step.service';

interface OutputVariableFieldProps {
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}

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

  const handleChange = useCallback(
    (_event: FormEvent<HTMLInputElement>, newValue: string) => {
      onChange(newValue);
    },
    [onChange],
  );

  return (
    <FormGroup
      label="Save as variable"
      labelHelp={
        <Popover
          bodyContent="Copy the DataMapper step output to a variable in addition to the body. When this is left empty, the DataMapper step output is delivered as a message body only."
          triggerAction="hover"
          withFocusTrap={false}
        >
          <Button variant="plain" aria-label="More info" icon={<HelpIcon />} />
        </Popover>
      }
    >
      <TextInput
        id="output-variable-name"
        data-testid="output-variable-name-input"
        value={value}
        placeholder="Variable name"
        validated={getValidated(value)}
        isDisabled={isDisabled}
        onChange={handleChange}
        aria-label="Output variable name"
      />
      {error && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error" data-testid="output-variable-name-error">
              {error}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};
