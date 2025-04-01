import {
  Button,
  DropdownItem,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon, PortIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useState } from 'react';
import { isDefined } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldWrapper } from './FieldWrapper';
import { FieldActions } from './FieldActions';

export const PasswordField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const [passwordHidden, setPasswordHidden] = useState<boolean>(true);
  const { value = '', onChange, isRaw, wrapValueWithRaw } = useFieldValue<string>(propName);
  const lastPropName = propName.split('.').pop();
  const ariaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${lastPropName} field`;

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
      isRaw={isRaw}
    >
      <TextInputGroup>
        <TextInputGroupMain
          type={passwordHidden ? 'password' : 'text'}
          role="textbox"
          id={propName}
          name={propName}
          placeholder={schema.default?.toString()}
          value={value}
          onChange={onFieldChange}
          aria-label={schema.title}
          aria-describedby={id}
        />

        <TextInputGroupUtilities>
          <Button
            variant="plain"
            data-testid={`${propName}__toggle-visibility`}
            aria-label={passwordHidden ? `Show ${lastPropName} value` : `Hide ${lastPropName} value`}
            onClick={() => {
              setPasswordHidden(!passwordHidden);
            }}
          >
            {passwordHidden ? <EyeIcon /> : <EyeSlashIcon />}
          </Button>
          <FieldActions>
            <DropdownItem
              onClick={onRemove}
              key={propName + '-dropdown-remove'}
              data-testid={`${propName}__clear`}
              aria-label={ariaLabel}
              title={ariaLabel}
              icon={<TimesIcon />}
            >
              Clear
            </DropdownItem>
            <DropdownItem
              value={0}
              key={propName + 'dropdown-toRaw'}
              onClick={() => wrapValueWithRaw()}
              disabled={value === ''}
              icon={<PortIcon />}
            >
              Raw
            </DropdownItem>
          </FieldActions>
        </TextInputGroupUtilities>
      </TextInputGroup>
    </FieldWrapper>
  );
};
