import { FunctionComponent, useMemo } from 'react';

import { IPropertiesTab, IPropertiesTable, PropertiesTableType } from './PropertiesModal.models';
import { PropertiesTableSimple, PropertiesTableTree } from './Tables';

interface IPropertiesTabsProps {
  tab: IPropertiesTab;
  tab_index: number;
}

/** A run of tables rendered together, plus the index of its first table within the tab */
interface ITableGroup {
  startIndex: number;
  tables: IPropertiesTable[];
}

const haveSameHeaders = (a: IPropertiesTable, b: IPropertiesTable): boolean =>
  a.headers.length === b.headers.length && a.headers.every((header, index) => header === b.headers[index]);

/**
 * Groups consecutive simple tables with identical headers so they can be rendered as row groups
 * of a single table, which keeps their columns aligned. Tree tables always stay on their own.
 */
export const groupTables = (tables: IPropertiesTable[]): ITableGroup[] => {
  const groups: ITableGroup[] = [];

  tables.forEach((table, index) => {
    const lastGroup = groups.at(-1);
    const lastTable = lastGroup?.tables.at(-1);

    if (
      lastGroup &&
      lastTable &&
      table.type === PropertiesTableType.Simple &&
      lastTable.type === PropertiesTableType.Simple &&
      haveSameHeaders(lastTable, table)
    ) {
      lastGroup.tables.push(table);
    } else {
      groups.push({ startIndex: index, tables: [table] });
    }
  });

  return groups;
};

export const PropertiesTabs: FunctionComponent<IPropertiesTabsProps> = (props) => {
  const groups = useMemo(() => groupTables(props.tab.tables), [props.tab.tables]);

  return (
    <div>
      {groups.map((group) => {
        const groupKey = 'tab-' + props.tab_index + '-table-' + group.startIndex;
        const firstTable = group.tables[0];

        switch (firstTable.type) {
          case PropertiesTableType.Simple:
            return (
              <PropertiesTableSimple
                key={groupKey}
                tables={group.tables}
                rootDataTestId={'tab-' + props.tab_index}
                startTableIndex={group.startIndex}
              />
            );
          case PropertiesTableType.Tree:
            return <PropertiesTableTree key={groupKey} table={firstTable} rootDataTestId={groupKey} />;
        }
      })}
    </div>
  );
};
