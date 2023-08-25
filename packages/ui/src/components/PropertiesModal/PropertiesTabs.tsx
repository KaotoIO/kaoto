import { Tab, Tabs } from '@patternfly/react-core';
import { FunctionComponent, useState } from 'react';
import { IPropertiesTable } from './PropertiesModal.models';
import { PropertiesTable } from './PropertiesTable';
import React from 'react';

export interface IPropertiesTab {
  rootName: string;
  tables: IPropertiesTable[];
}

interface IPropertiesTabsProps {
  tabs: IPropertiesTab[];
}

export const PropertiesTabs: FunctionComponent<IPropertiesTabsProps> = (props) => {
  const [activeTabKey, setActiveTabKey] = useState<string | number>(0);
  const handleTabClick = (
    event: React.MouseEvent<any> | React.KeyboardEvent | MouseEvent,
    tabIndex: string | number,
  ) => {
    setActiveTabKey(tabIndex);
  };

  return (
    <Tabs
      activeKey={activeTabKey}
      onSelect={handleTabClick}
      aria-label="Properties tabs"
      isBox={true}
      role="region"
    >
      {props.tabs.map((tab, index) => (
        <Tab key={index} eventKey={index} title={tab.rootName}>
          {tab.tables.map((table, index) => (
            <PropertiesTable key={index} table={table}></PropertiesTable>
          ))}
        </Tab>
      ))}
    </Tabs>
  );
};
