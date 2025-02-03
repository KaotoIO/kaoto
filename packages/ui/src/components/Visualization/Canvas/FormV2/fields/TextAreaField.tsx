import {
  Button,
  FormGroup,
  FormGroupLabelHelp,
  InputGroup,
  InputGroupItem,
  Popover,
  TextArea,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useContext } from 'react';
import { isDefined } from '../../../../../utils';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';

export const TextAreaField: FunctionComponent<FieldProps> = ({ propName, required, onRemove: onRemoveProps }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange } = useFieldValue<string>(propName);
  const ariaLabel = isDefined(onRemoveProps) ? 'Remove' : `Clear ${propName} field`;
  const rows = Math.max(value.split('\n').length, 2);

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
    return <div>TextAreaField - Schema not defined</div>;
  }

  const id = `${propName}-popover`;

  return (
    <FormGroup
      fieldId={propName}
      label={`${schema.title} (${propName})`}
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
      <InputGroup>
        <InputGroupItem isFill>
          <TextArea
            rows={rows}
            type="text"
            id={propName}
            name={propName}
            placeholder={schema.default?.toString()}
            value={value}
            onChange={onFieldChange}
            aria-describedby={id}
          />
        </InputGroupItem>

        <InputGroupItem>
          <Button variant="plain" onClick={onRemove} aria-label={ariaLabel} title={ariaLabel} icon={<TimesIcon />} />
        </InputGroupItem>
      </InputGroup>
    </FormGroup>
  );
};
