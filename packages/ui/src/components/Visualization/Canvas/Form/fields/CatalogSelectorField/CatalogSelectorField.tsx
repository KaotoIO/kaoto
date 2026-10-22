import './CatalogSelectorField.scss';

import { Dropdown } from '@carbon/react';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useCallback, useContext, useMemo } from 'react';

import { useRuntimeContext } from '../../../../../../hooks/useRuntimeContext/useRuntimeContext';
import { SourceSchemaType } from '../../../../../../models/camel/source-schema-type';
import { findCatalog } from '../../../../../../utils/catalog-helper';
import { getRuntimeIcon } from '../../../../../Icons/RuntimeIcon';

interface ICatalogSelectorField extends FieldProps {
  schemaType: SourceSchemaType;
  validRuntimes: string[];
}

/** Flat item used by Dropdown — group headers are disabled, so they are shown but cannot be selected. */
interface CatalogItem {
  id: string;
  label: string;
  isHeader?: boolean;
  disabled?: boolean;
}

const renderCatalogItem = (item: CatalogItem) =>
  item.isHeader ? (
    <span className="catalog-selector-group-header">
      {getRuntimeIcon(item.label)} {item.label}
    </span>
  ) : (
    <span className="catalog-selector-item">{item.label}</span>
  );

const renderSelectedCatalogItem = (item: CatalogItem) => (
  <span className="catalog-selector-selected">
    {getRuntimeIcon(item.label)}
    <span>{item.label}</span>
  </span>
);

const CatalogSelectorField: FunctionComponent<ICatalogSelectorField> = ({
  propName,
  required,
  schemaType,
  validRuntimes,
}) => {
  const { schema } = useContext(SchemaContext);
  const { value: storedValue, onChange, disabled } = useFieldValue<string | undefined>(propName);
  const { catalogLibrary } = useRuntimeContext();

  const catalogOptions = useMemo(
    () => (catalogLibrary?.definitions ?? []).filter((c) => validRuntimes.includes(c.runtime)),
    [catalogLibrary?.definitions, validRuntimes],
  );

  const value = storedValue || findCatalog(schemaType, catalogLibrary)?.name;

  /** Flat list: group header followed by its catalog entries. */
  const items: CatalogItem[] = useMemo(() => {
    const grouped = catalogOptions.reduce(
      (acc, catalog) => {
        if (!acc[catalog.runtime]) acc[catalog.runtime] = [];
        acc[catalog.runtime].push(catalog);
        return acc;
      },
      {} as Record<string, CatalogLibraryEntry[]>,
    );

    return Object.entries(grouped).flatMap(([runtime, catalogs]) => [
      { id: `__header__${runtime}`, label: runtime, isHeader: true, disabled: true },
      ...catalogs.map((c) => ({ id: c.name, label: c.name })),
    ]);
  }, [catalogOptions]);

  const selectedItem = useMemo(() => items.find((item) => item.id === value), [items, value]);

  const handleChange = useCallback(
    ({ selectedItem: item }: { selectedItem: CatalogItem | null }) => {
      if (!item || item.isHeader) return;
      onChange(item.id);
    },
    [onChange],
  );

  if (!catalogLibrary) {
    return (
      <FieldWrapper
        propName={propName}
        required={required}
        title={schema.title}
        type="object"
        description={schema.description}
      >
        <div>Loading catalogs...</div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
    >
      <Dropdown
        id={`${propName}-catalog-selector`}
        titleText=""
        hideLabel
        label=""
        items={items}
        itemToString={(item) => item?.label ?? ''}
        itemToElement={renderCatalogItem}
        renderSelectedItem={renderSelectedCatalogItem}
        selectedItem={selectedItem}
        disabled={disabled}
        data-testid={`${propName}-catalog-selector-toggle`}
        onChange={handleChange}
      />
    </FieldWrapper>
  );
};

const INTEGRATION_RUNTIMES = ['Main', 'Quarkus', 'Spring Boot'];
export const RuntimeCatalogNameField: FunctionComponent<FieldProps> = (props) => (
  <CatalogSelectorField schemaType={SourceSchemaType.RouteYaml} validRuntimes={INTEGRATION_RUNTIMES} {...props} />
);

const TESTING_RUNTIMES = ['Citrus'];
export const TestingCatalogNameField: FunctionComponent<FieldProps> = (props) => (
  <CatalogSelectorField schemaType={SourceSchemaType.Test} validRuntimes={TESTING_RUNTIMES} {...props} />
);
