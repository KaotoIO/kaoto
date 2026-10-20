import { FieldProps, FieldWrapper, SchemaContext, Typeahead, TypeaheadItem, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DynamicCatalogRegistry } from '../../../../../../dynamic-catalog/dynamic-catalog-registry';
import { CatalogKind, ICitrusComponentDefinition } from '../../../../../../models';

export interface InfraServiceCatalogEntry {
  serviceName: string;
  implementations: { implName: string; def: ICitrusComponentDefinition }[];
  def: ICitrusComponentDefinition;
}

export function parseInfraCatalog(
  infraCatalog: Record<string, ICitrusComponentDefinition>,
): InfraServiceCatalogEntry[] {
  const implsByService = new Map<string, { implName: string; def: ICitrusComponentDefinition }[]>();
  const serviceDefMap = new Map<string, ICitrusComponentDefinition>();

  for (const key in infraCatalog) {
    const dotIndex = key.indexOf('.');
    if (dotIndex < 0) {
      serviceDefMap.set(key, infraCatalog[key]);
      if (!implsByService.has(key)) implsByService.set(key, []);
    } else {
      const prefix = key.substring(0, dotIndex);
      if (!implsByService.has(prefix)) implsByService.set(prefix, []);
      implsByService.get(prefix)!.push({ implName: key.substring(dotIndex + 1), def: infraCatalog[key] });
    }
  }

  const entries: InfraServiceCatalogEntry[] = [];

  for (const serviceName of [...implsByService.keys()].sort()) {
    const explicitDef = serviceDefMap.get(serviceName);
    const fallbackTitle = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
    const def: ICitrusComponentDefinition = explicitDef ?? {
      kind: CatalogKind.TestInfraService,
      name: serviceName,
      title: fallbackTitle,
      description: `${fallbackTitle} Services`,
    };

    entries.push({
      serviceName,
      def,
      implementations: (implsByService.get(serviceName) ?? []).sort((a, b) => a.implName.localeCompare(b.implName)),
    });
  }

  return entries;
}

export const InfraServiceField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value: serviceValue = '', onChange: onServiceChange, disabled } = useFieldValue<string | undefined>(propName);
  const lastDot = propName.lastIndexOf('.');
  const implementationPropName =
    lastDot >= 0 ? propName.substring(0, lastDot + 1) + 'implementation' : 'implementation';
  const { onChange: onImplementationChange } = useFieldValue<string | undefined>(implementationPropName);
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
    const result: TypeaheadItem<string>[] = [];

    for (const entry of catalogEntries) {
      result.push({
        name: entry.def.title || entry.serviceName,
        description: entry.def.description,
        value: entry.serviceName,
      });

      for (const { implName, def } of entry.implementations) {
        const parentTitle = entry.def.title || entry.serviceName;
        result.push({
          name: `${parentTitle} › ${def.title?.replace(parentTitle, '').trim() || implName}`,
          description: def.description,
          value: `${entry.serviceName}:${implName}`,
        });
      }
    }

    return result;
  }, [catalogEntries]);

  const selectedItem = useMemo(() => {
    if (!serviceValue) return undefined;
    return items.find((item) => item.value === serviceValue) ?? { value: serviceValue, name: serviceValue };
  }, [items, serviceValue]);

  const onItemChange = useCallback(
    (item?: TypeaheadItem<string>) => {
      if (!item) return;
      const colonIndex = item.value.indexOf(':');
      if (colonIndex < 0) {
        onServiceChange(item.value);
        onImplementationChange(undefined as unknown as string);
      } else {
        onServiceChange(item.value.substring(0, colonIndex));
        onImplementationChange(item.value.substring(colonIndex + 1));
      }
    },
    [onServiceChange, onImplementationChange],
  );

  const onCleanInput = useCallback(() => {
    onServiceChange(undefined);
    onImplementationChange(undefined as unknown as string);
  }, [onServiceChange, onImplementationChange]);

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
        placeholder={schema.default?.toString()}
        id={propName}
        onChange={onItemChange}
        onCleanInput={onCleanInput}
        disabled={disabled}
        allowCustomInput
      />
    </FieldWrapper>
  );
};
