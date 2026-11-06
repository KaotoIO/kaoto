import { ContentSwitcher, Switch } from '@carbon/react';
import { FunctionComponent, useContext } from 'react';

import { CanvasFormTabsContext, FormTabsModes, TabKeys } from '../providers/canvas-form-tabs.provider';

/**
 * Required / All / Modified switcher. Kept in its own file, without any dependency on the filter field,
 * so it can be removed without touching the rest of the toolbar.
 */
export const FormSectionTabs: FunctionComponent = () => {
  const { selectedTab, setSelectedTab } = useContext(CanvasFormTabsContext);
  const selectedIndex = Object.keys(FormTabsModes).indexOf(selectedTab);

  return (
    <ContentSwitcher
      aria-label="Single selectable form tabs"
      className="kaoto-form-toolbar__tabs"
      selectedIndex={selectedIndex}
      onChange={({ name }: { name?: string | number }) => {
        if (typeof name === 'string') {
          setSelectedTab(name as TabKeys);
        }
      }}
    >
      {Object.entries(FormTabsModes).map(([mode, tooltip]) => (
        <Switch key={mode} name={mode} text={mode} title={tooltip} data-testid={`tab-${mode}`} />
      ))}
    </ContentSwitcher>
  );
};
