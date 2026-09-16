import { ContentSwitcher, Switch } from '@carbon/react';
import { FunctionComponent, useContext } from 'react';
import { CanvasFormTabsContext } from '../../form/providers/canvas-form-tabs.provider';

export const TabSelector: FunctionComponent = () => {
  const { selectedTab, setSelectedTab } = useContext(CanvasFormTabsContext);

  return (
    <ContentSwitcher
      size="md"
      selectedIndex={selectedTab === 'All' ? 0 : selectedTab === 'Required' ? 1 : 2}
      onChange={(e) => {
        const index = e.index;
        if (index === 0) setSelectedTab('All');
        else if (index === 1) setSelectedTab('Required');
        else setSelectedTab('Modified');
      }}
    >
      <Switch name="All" text="All" />
      <Switch name="Required" text="Required" />
      <Switch name="Modified" text="Modified" />
    </ContentSwitcher>
  );
};
