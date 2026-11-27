import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FieldProps, GroupedSelectField, GroupedSelectOptionGroup } from '@kaoto/forms';
import { FunctionComponent, useMemo } from 'react';

import { useRuntimeContext } from '../../../../../../hooks/useRuntimeContext/useRuntimeContext';
import { SourceSchemaType } from '../../../../../../models/camel/source-schema-type';
import { findCatalog } from '../../../../../../utils/catalog-helper';
import { getRuntimeIcon } from '../../../../../Icons/RuntimeIcon';

interface ICatalogSelectorField extends FieldProps {
  schemaType: SourceSchemaType;
  validRuntimes: string[];
}

/** Groups the catalogs by runtime, keeping only the runtimes the field accepts. */
const getRuntimeGroupsFromCatalogs = (
  catalogs: CatalogLibraryEntry[],
  validRuntimes: string[],
): GroupedSelectOptionGroup[] => {
  const catalogsByRuntime = catalogs
    .filter((catalog) => validRuntimes.includes(catalog.runtime))
    .reduce<Record<string, CatalogLibraryEntry[]>>((accumulator, catalog) => {
      if (!accumulator[catalog.runtime]) accumulator[catalog.runtime] = [];
      accumulator[catalog.runtime].push(catalog);
      return accumulator;
    }, {});

  return Object.entries(catalogsByRuntime).map(([runtime, runtimeCatalogs]) => ({
    label: runtime,
    icon: getRuntimeIcon(runtime),
    options: runtimeCatalogs.map((catalog) => ({
      value: catalog.name,
      label: catalog.name,
      icon: getRuntimeIcon(catalog.name), // Drawn only in the closed toggle, not in the list
    })),
  }));
};

const CatalogSelectorField: FunctionComponent<ICatalogSelectorField> = ({
  propName,
  required,
  schemaType,
  validRuntimes,
}) => {
  const { catalogLibrary } = useRuntimeContext();

  const runtimeGroups = useMemo(
    () => getRuntimeGroupsFromCatalogs(catalogLibrary?.definitions ?? [], validRuntimes),
    [catalogLibrary?.definitions, validRuntimes],
  );

  return (
    <GroupedSelectField
      propName={propName}
      required={required}
      groups={catalogLibrary ? runtimeGroups : undefined}
      fallbackValue={findCatalog(schemaType, catalogLibrary)?.name}
      loadingText="Loading catalogs..."
      data-testid={`${propName}-catalog-selector-toggle`}
    />
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
