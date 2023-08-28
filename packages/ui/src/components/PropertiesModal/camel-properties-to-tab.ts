import { IPropertiesTableFilter } from '../../camel-utils/camel-to-table.adapter';
import { IPropertiesTab, IPropertiesTable } from './PropertiesModal.models';

interface IPropertiesTransformToTable {
  transformFunction: (properties: any, filter?: IPropertiesTableFilter) => IPropertiesTable;
  propertiesObject: any;
  tableCaption?: string;
  filter?: IPropertiesTableFilter;
}

/**
 * This function transforms properties data (from camel-component, camel-processor, kamelets) into one or more tables which are added into the final IPropertiesTab.
 *
 * @param transformationsData object which contains function which is used for transfromation properties object into IPropertiesTable, optionally filter and table caption
 * @param tabTitle - Title of the Tab
 * @returns Tab data which will be use for rendering one Tab
 */
export const transformPropertiesIntoTab = (
  transformationsData: IPropertiesTransformToTable[],
  tabTitle: string,
): IPropertiesTab | undefined => {
  let tables = [];
  for (let transformationData of transformationsData) {
    let table = transformationData.transformFunction(transformationData.propertiesObject, transformationData.filter);
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
