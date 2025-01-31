import { FormGroup, FormGroupLabelHelp, Popover } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { Typeahead } from '../../../../typeahead/Typeahead';
import { TypeaheadItem } from '../../../../typeahead/Typeahead.types';

export const EnumField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange } = useFieldValue<string | undefined>(propName);

  const items: TypeaheadItem<string>[] = useMemo(
    () =>
      schema?.enum?.map((item) => ({
        name: String(item),
        description: '',
        value: String(item),
      })) ?? [],
    [schema],
  );

  const selectedItem = useMemo(() => {
    if (!value) {
      return undefined;
    }

    // Object values are stringified. Double check later different approach.
    if (typeof value === 'object') {
      return {
        value: JSON.stringify(value),
        name: JSON.stringify(value),
        description: '',
      };
    }

    return items.find((item) => item.name === value) ?? { value: value, name: value, description: '' };
  }, [items, value]);

  const onItemChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      onChange(item?.name);
    },
    [onChange],
  );

  const onCleanInput = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  if (!schema) {
    return <div>EnumField - Schema not defined</div>;
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
      <Typeahead
        selectedItem={selectedItem}
        items={items}
        placeholder={schema.default?.toString()}
        id={propName}
        onChange={onItemChange}
        onCleanInput={onCleanInput}
      />
    </FormGroup>
  );
};
