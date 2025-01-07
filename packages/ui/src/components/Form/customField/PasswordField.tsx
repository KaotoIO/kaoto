import { connectField, filterDOMProps } from 'uniforms';
import {
  Button,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  TextInput,
  TextInputProps,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { wrapField } from '@kaoto-next/uniforms-patternfly';
import { Ref, useState } from 'react';

type PasswordFieldProps = {
  id: string;
  decimal?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onChange: (value?: string) => void;
  value?: string;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  helperText?: string;
  field?: { format: string };
} & Omit<TextInputProps, 'isDisabled'>;

const PasswordFieldComponent = ({ onChange, ...props }: PasswordFieldProps) => {
  const [passwordHidden, setPasswordHidden] = useState<boolean>(true);

  return wrapField(
    props,
    <InputGroup>
      <InputGroupItem isFill>
        <TextInput
          autoComplete="new-password"
          aria-label="uniforms text field"
          data-testid="password-field"
          name={props.name}
          isDisabled={props.disabled}
          validated={props.error ? 'error' : 'default'}
          onChange={(_event, value) => {
            onChange(value);
          }}
          placeholder={props.placeholder}
          ref={props.inputRef}
          type={passwordHidden ? 'password' : 'text'}
          value={props.value ?? ''}
          {...filterDOMProps(props)}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem icon={props.error && <ExclamationCircleIcon />} variant={props.error ? 'error' : 'default'}>
              {!props.error ? props.helperText : props.errorMessage}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </InputGroupItem>
      <InputGroupItem>
        <Button
          data-testid={'password-show-hide-button'}
          variant="control"
          onClick={() => {
            setPasswordHidden(!passwordHidden);
          }}
          aria-label={passwordHidden ? 'Show' : 'Hide'}
        >
          {passwordHidden ? <EyeIcon /> : <EyeSlashIcon />}
        </Button>
      </InputGroupItem>
    </InputGroup>,
  );
};

export const PasswordField = connectField(PasswordFieldComponent);
