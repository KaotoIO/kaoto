import { Button, FormGroup, FormGroupLabelHelp, Popover, TextInput } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useState } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import './PasswordField.scss';

export const PasswordField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const [passwordHidden, setPasswordHidden] = useState<boolean>(true);
  const { value = '', onChange } = useFieldValue<string>(propName);
  const onFieldChange = (_event: unknown, value: string) => {
    onChange(value);
  };

  if (!schema) {
    return <div>PasswordField - Schema not defined</div>;
  }

  const id = `${propName}-popover`;

  return (
    <FormGroup
      fieldId={propName}
      label={`${schema.title} (${propName})`}
      name={`${schema.title} (${propName})`}
      isRequired={required}
      labelHelp={
        <Popover
          id={id}
          headerContent={<p>{schema.title}</p>}
          bodyContent={<p>{schema.description}</p>}
          footerContent={<p>Default: {schema.default?.toString() ?? 'no default value'}</p>}
          triggerAction="hover"
          withFocusTrap={false}
        >
          <FormGroupLabelHelp aria-label={`More info for ${schema.title} field`} />
        </Popover>
      }
    >
      <div className="password-field">
        <TextInput
          type={passwordHidden ? 'password' : 'text'}
          id={propName}
          name={propName}
          value={value}
          onChange={onFieldChange}
          aria-describedby={id}
        />
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
      </div>
    </FormGroup>
  );
};
