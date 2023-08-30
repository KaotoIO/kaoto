import { Tab, Tabs } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';
import { IPropertiesTab } from './PropertiesModal.models';
import { PropertiesTable } from './PropertiesTable';

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
          {tab.tables.map((table, table_index) => (
            <PropertiesTable
              key={table_index}
              table={table}
              rootDataTestId={'tab-' + tab_index + '-table-' + table_index}
            ></PropertiesTable>
          ))}
        </Tab>
      ))}
    </Tabs>
  );
};
