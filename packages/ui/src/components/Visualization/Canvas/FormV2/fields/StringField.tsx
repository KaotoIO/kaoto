import { DropdownItem, TextInputGroup, TextInputGroupMain, TextInputGroupUtilities } from '@patternfly/react-core';
import { PortIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext, useEffect, useState } from 'react';
import { isDefined } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldWrapper } from './FieldWrapper';
import { FieldActions } from './FieldActions';

export const StringField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const [isRaw, setIsRaw] = useState(false);
  const { value = '', errors, onChange, disabled } = useFieldValue<string>(propName);
  const lastPropName = propName.split('.').pop();
  const ariaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${lastPropName} field`;

  useEffect(() => {
    const match = value?.match(/^RAW\((.*)\)$/);
    setIsRaw(!!match);
  }, [value]);

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
  const wrapValueWithRaw = () => {
    if (!isRaw) {
      onChange(`RAW(${value})`);
      setIsRaw(true);
    } else {
      const match = value?.match(/^RAW\((.*)\)$/);
      onChange(match ? match[1] : (value ?? ''));
      setIsRaw(false);
    }
  };

  const id = `${propName}-popover`;

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
      errors={errors}
      isRaw={isRaw}
    >
      <TextInputGroup validated={errors ? 'error' : undefined} isDisabled={disabled}>
        <TextInputGroupMain
          type="text"
          role="textbox"
          className="pf-m-icon kaoto-form__string-field"
          id={propName}
          name={propName}
          placeholder={schema.default?.toString()}
          value={value}
          onChange={onFieldChange}
          aria-label={schema.title}
          aria-describedby={id}
        />

        <TextInputGroupUtilities>
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
              key={propName + '-dropdown-toRaw'}
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
