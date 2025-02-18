import { Button, TextInputGroup, TextInputGroupMain, TextInputGroupUtilities } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useState } from 'react';
import { isDefined } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldWrapper } from './FieldWrapper';

export const PasswordField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const [passwordHidden, setPasswordHidden] = useState<boolean>(true);
  const { value = '', onChange } = useFieldValue<string>(propName);
  const lastPropName = propName.split('.').pop();
  const ariaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${lastPropName} field`;
  if (!isDefined(schema)) {
    throw new Error(`PasswordField: schema is not defined for ${propName}`);
  }

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

  const id = `${propName}-popover`;

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="secret"
      description={schema.description}
      defaultValue={schema.default?.toString()}
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
    </FieldWrapper>
  );
};
