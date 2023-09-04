import { Tab, Tabs } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';
import { IPropertiesTab, PropertiesTableType } from './PropertiesModal.models';
import { PropertiesTableSimple, PropertiesTableTree } from './Tables';

interface IPropertiesTabsProps {
  tabs: IPropertiesTab[];
}

export const PropertiesTabs: FunctionComponent<IPropertiesTabsProps> = (props) => {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const handleTabClick = (_event: unknown, tabIndex: string | number) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <Tabs activeKey={activeTabKey} onSelect={handleTabClick} aria-label="Properties tabs" isBox={true} role="region">
      {props.tabs.map((tab, tab_index) => (
        <Tab data-testid={'tab-' + tab_index} key={tab_index} eventKey={tab_index} title={tab.rootName}>
          {tab.tables.map((table, table_index) => {
            switch (table.type) {
              case PropertiesTableType.Simple:
                return (
                  <PropertiesTableSimple
                    key={table_index}
                    table={table}
                    rootDataTestId={'tab-' + tab_index + '-table-' + table_index}
                  ></PropertiesTableSimple>
                );
              case PropertiesTableType.Tree:
                return (
                  <PropertiesTableTree
                    key={table_index}
                    table={table}
                    rootDataTestId={'tab-' + tab_index + '-table-' + table_index}
                  ></PropertiesTableTree>
                );
            }
          })}
        </Tab>
      ))}
    </Tabs>
  );
};
