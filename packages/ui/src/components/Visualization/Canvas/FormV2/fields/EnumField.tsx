import { FunctionComponent, useCallback, useContext, useMemo } from 'react';
import { Typeahead } from '../../../../typeahead/Typeahead';
import { TypeaheadItem } from '../../../../typeahead/Typeahead.types';
import { useFieldValue } from '../hooks/field-value';
import { SchemaContext } from '../providers/SchemaProvider';
import { FieldProps } from '../typings';
import { FieldWrapper } from './FieldWrapper';
import { isDefined } from '../../../../../utils';

export const EnumField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value = '', onChange, disabled } = useFieldValue<string | undefined>(propName);
  if (!isDefined(schema)) {
    throw new Error(`StringField: schema is not defined for ${propName}`);
  }

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

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="enum"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <Typeahead
        data-testid={propName}
        selectedItem={selectedItem}
        items={items}
        placeholder={schema.default?.toString()}
        id={propName}
        onChange={onItemChange}
        onCleanInput={onCleanInput}
        disabled={disabled}
      />
    </FieldWrapper>
  );
};
