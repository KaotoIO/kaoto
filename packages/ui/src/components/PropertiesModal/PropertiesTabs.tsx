import { FunctionComponent } from 'react';
import { IPropertiesTab, PropertiesTableType } from './PropertiesModal.models';
import { PropertiesTableSimple, PropertiesTableTree } from './Tables';

interface IPropertiesTabsProps {
  tab: IPropertiesTab;
  tab_index: number;
}

export const PropertiesTabs: FunctionComponent<IPropertiesTabsProps> = (props) => {
  return (
    <div>
      {props.tab.tables.map((table, table_index) => {
        switch (table.type) {
          case PropertiesTableType.Simple:
            return (
              <PropertiesTableSimple
                key={table_index}
                table={table}
                rootDataTestId={'tab-' + props.tab_index + '-table-' + table_index}
              />
            );
          case PropertiesTableType.Tree:
            return (
              <PropertiesTableTree
                key={table_index}
                table={table}
                rootDataTestId={'tab-' + props.tab_index + '-table-' + table_index}
              />
            );
        }
      })}
    </div>
  );
};
