import { Select, SelectItem, SelectItemGroup } from '@carbon/react';
import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { FunctionComponent, useContext, useMemo } from 'react';

import { useRuntimeContext } from '../../../../../../hooks/useRuntimeContext/useRuntimeContext';
import { SourceSchemaType } from '../../../../../../models/camel/source-schema-type';
import { findCatalog } from '../../../../../../utils/catalog-helper';

interface ICatalogSelectorField extends FieldProps {
  schemaType: SourceSchemaType;
  validRuntimes: string[];
}

const CatalogSelectorField: FunctionComponent<ICatalogSelectorField> = ({
  propName,
  required,
  schemaType,
  validRuntimes,
}) => {
  const { schema } = useContext(SchemaContext);
  const { value: storedValue, onChange, disabled } = useFieldValue<string | undefined>(propName);
  const { catalogLibrary } = useRuntimeContext();

  const catalogOptions = useMemo(() => {
    return (catalogLibrary?.definitions ?? []).filter((catalog) => validRuntimes.includes(catalog.runtime));
  }, [catalogLibrary?.definitions, validRuntimes]);

  const value = storedValue || findCatalog(schemaType, catalogLibrary)?.name;

  const groupedCatalogs = useMemo(() => {
    return catalogOptions.reduce(
      (acc, catalog) => {
        if (!acc[catalog.runtime]) {
          acc[catalog.runtime] = [];
        }
        acc[catalog.runtime].push(catalog);
        return acc;
      },
      {} as Record<string, CatalogLibraryEntry[]>,
    );
  }, [catalogOptions]);

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
      <Select
        id={`${propName}-catalog-selector`}
        labelText=""
        hideLabel
        value={value ?? ''}
        disabled={disabled}
        data-testid={`${propName}-catalog-selector-toggle`}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          onChange(e.target.value);
        }}
      >
        {Object.entries(groupedCatalogs).map(([runtime, catalogs]) => (
          <SelectItemGroup key={runtime} label={runtime}>
            {catalogs.map((catalog) => (
              <SelectItem key={catalog.name} value={catalog.name} text={catalog.name} />
            ))}
          </SelectItemGroup>
        ))}
      </Select>
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
