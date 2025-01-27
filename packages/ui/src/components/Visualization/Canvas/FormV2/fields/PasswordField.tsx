import {
  Button,
  FormGroup,
  FormGroupLabelHelp,
  Popover,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useState } from 'react';
import { isDefined } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';

export const PasswordField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const [passwordHidden, setPasswordHidden] = useState<boolean>(true);
  const { value = '', onChange } = useFieldValue<string>(propName);
  const ariaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${propName} field`;

  const onFieldChange = (_event: unknown, value: string) => {
    onChange(value);
  };

  const onRemove = () => {
    if (isDefined(onRemoveProps)) {
      onRemoveProps(propName);
      return;
    }

    /** Clear field by removing its value */
    onChange(undefined as unknown as string);
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
          headerContent={
            <p>
              {schema.title} {`<${schema.type}>`}
            </p>
          }
          bodyContent={<p>{schema.description}</p>}
          footerContent={<p>Default: {schema.default?.toString() ?? 'no default value'}</p>}
          triggerAction="hover"
          withFocusTrap={false}
        >
          <FormGroupLabelHelp aria-label={`More info for ${schema.title} field`} />
        </Popover>
      }
    >
      <TextInputGroup>
        <TextInputGroupMain
          type={passwordHidden ? 'password' : 'text'}
          id={propName}
          name={propName}
          value={value}
          onChange={onFieldChange}
          aria-describedby={id}
        />

        <TextInputGroupUtilities>
          <Button
            data-testid="password-show-hide-button"
            variant="plain"
            onClick={() => {
              setPasswordHidden(!passwordHidden);
            }}
            aria-label={passwordHidden ? 'Show' : 'Hide'}
          >
            {passwordHidden ? <EyeIcon /> : <EyeSlashIcon />}
          </Button>
          <Button variant="plain" onClick={onRemove} aria-label={ariaLabel} title={ariaLabel} icon={<TimesIcon />} />
        </TextInputGroupUtilities>
      </TextInputGroup>
    </FormGroup>
  );
};
