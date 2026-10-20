import { FieldProps, FieldWrapper, SchemaContext, Typeahead, TypeaheadItem, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICitrusComponentDefinition } from '../../../../../../models';
import { parseInfraCatalog } from './InfraServiceField';

export const InfraImplementationField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value: implValue = '', onChange, disabled } = useFieldValue<string | undefined>(propName);
  const lastDot = propName.lastIndexOf('.');
  const servicePropName = lastDot >= 0 ? propName.substring(0, lastDot + 1) + 'service' : 'service';
  const { value: serviceValue } = useFieldValue<string | undefined>(servicePropName);
  const [infraCatalog, setInfraCatalog] = useState<Record<string, ICitrusComponentDefinition>>({});

  useEffect(() => {
    void DynamicCatalogRegistry.get()
      .getCatalog(CatalogKind.TestInfraService)
      ?.getAll()
      .then((catalog) => {
        if (catalog) setInfraCatalog(catalog);
      });
  }, []);

  const catalogEntries = useMemo(() => parseInfraCatalog(infraCatalog), [infraCatalog]);

  const items: TypeaheadItem<string>[] = useMemo(() => {
    if (!serviceValue) return [];

    const entry = catalogEntries.find((e) => e.serviceName === serviceValue);
    if (!entry || entry.implementations.length === 0) return [];

    return entry.implementations.map(({ implName, def }) => ({
      name: def.title?.replace(entry.def.title || entry.serviceName, '').trim() || implName,
      description: def.description,
      value: implName,
    }));
  }, [catalogEntries, serviceValue]);

  const selectedItem = useMemo(() => {
    if (!implValue) return undefined;
    return items.find((item) => item.value === implValue) ?? { value: implValue, name: implValue };
  }, [items, implValue]);

  const onItemChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      onChange(item?.value);
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
      type="string"
      description={schema.description}
      defaultValue={schema.default?.toString()}
    >
      <Typeahead
        aria-label={schema.title ?? propName}
        data-testid={propName}
        selectedItem={selectedItem}
        items={items}
        placeholder={items.length > 0 ? schema.default?.toString() : undefined}
        id={propName}
        onChange={onItemChange}
        onCleanInput={onCleanInput}
        disabled={disabled}
        allowCustomInput
      />
    </FieldWrapper>
  );
};
