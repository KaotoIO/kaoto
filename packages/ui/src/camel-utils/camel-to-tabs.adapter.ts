import { IPropertiesTab, IPropertiesTable } from '../components/PropertiesModal';
import { ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../models';
import { isDefined } from '../utils';
import {
  IPropertiesTableFilter,
  camelComponentApisToTable,
  camelComponentPropertiesToTable,
  camelProcessorPropertiesToTable,
  kameletToPropertiesTable,
} from './camel-to-table.adapter';

interface IPropertiesTransformToTable<K, T> {
  transformFunction: (properties: K, filter?: IPropertiesTableFilter<T>) => IPropertiesTable;
  objectToTransform: K;
  tableCaption?: string;
  filter?: IPropertiesTableFilter<T>;
}

/**
 * This function transforms properties data (from camel-component, camel-processor, kamelets) into one or more tables which are added into the final IPropertiesTab.
 *
 * @param transformationsData object which contains function which is used for transfromation properties object into IPropertiesTable, the functions are defined in `camel-to-table.adapter.ts` file, optionally filter and table caption
 * @param tabTitle - Title of the Tab
 * @returns Tab data which will be use for rendering one Tab
 */
const transformPropertiesIntoTab = <K, T>(
  transformationsData: IPropertiesTransformToTable<K, T>[],
  tabTitle: string,
): IPropertiesTab | undefined => {
  const tables = [];
  for (const transformationData of transformationsData) {
    const table = transformationData.transformFunction(transformationData.objectToTransform, transformationData.filter);
    if (table.rows.length == 0) continue; // we don't care about empty table
    if (transformationData.tableCaption)
      table.caption = transformationData.tableCaption + ' (' + table.rows.length + ')';
    tables.push(table);
  }
  if (tables.length == 0) return undefined;

  let allRowsInAllTables = 0;
  tables.forEach((table) => {
    allRowsInAllTables += table.rows.length;
  });
  return {
    rootName: tabTitle + ' (' + allRowsInAllTables + ')',
    tables: tables,
  };
};

export const transformCamelComponentIntoTab = (
  componentDef: ICamelComponentDefinition | undefined,
): IPropertiesTab[] => {
  if (!isDefined(componentDef)) return [];

  const finalTabs: IPropertiesTab[] = [];
  let tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: camelComponentPropertiesToTable,
        objectToTransform: componentDef.componentProperties,
      },
    ],
    'Component Options',
  );
  if (tab) finalTabs.push(tab);

  // properties, contains 2 subtables divided according to Kind
  tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: camelComponentPropertiesToTable,
        objectToTransform: componentDef.properties,
        filter: {
          filterKey: 'kind',
          filterValue: 'path',
        },
        tableCaption: 'path parameters',
      },
      {
        transformFunction: camelComponentPropertiesToTable,
        objectToTransform: componentDef.properties,
        filter: {
          filterKey: 'kind',
          filterValue: 'parameter',
        },
        tableCaption: 'query parameters',
      },
    ],
    'Endpoint Options',
  );
  if (tab) finalTabs.push(tab);

  // headers, only if exists
  if (componentDef.headers) {
    const tab = transformPropertiesIntoTab(
      [
        {
          transformFunction: camelComponentPropertiesToTable,
          objectToTransform: componentDef.headers,
        },
      ],
      'Message Headers',
    );
    if (tab) finalTabs.push(tab);
  }

  // apis, only if exists
  if (componentDef.apis) {
    const tab = transformPropertiesIntoTab(
      [
        {
          transformFunction: camelComponentApisToTable,
          objectToTransform: { apis: componentDef.apis!, apiProperties: componentDef.apiProperties! },
        },
      ],
      'APIs',
    );
    if (tab) finalTabs.push(tab);
  }
  return finalTabs;
};

export const transformCamelProcessorComponentIntoTab = (
  processorDef: ICamelProcessorDefinition | undefined,
): IPropertiesTab[] => {
  if (!isDefined(processorDef)) return [];

  const finalTabs: IPropertiesTab[] = [];
  const tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: camelProcessorPropertiesToTable,
        objectToTransform: processorDef.properties,
      },
    ],
    'Options',
  );
  if (tab) finalTabs.push(tab);
  return finalTabs;
};

export const transformKameletComponentIntoTab = (kameletDef: IKameletDefinition | undefined): IPropertiesTab[] => {
  if (!isDefined(kameletDef)) return [];

  const finalTabs: IPropertiesTab[] = [];
  const tab = transformPropertiesIntoTab(
    [
      {
        transformFunction: kameletToPropertiesTable,
        objectToTransform: kameletDef,
      },
    ],
    'Options',
  );
  if (tab) finalTabs.push(tab);
  return finalTabs;
};
