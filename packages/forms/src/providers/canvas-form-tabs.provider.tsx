import { createContext, FunctionComponent, PropsWithChildren, useMemo, useState } from 'react';

export type TabKeys = keyof typeof FormTabsModes;
export interface CanvasFormTabsContextResult {
  selectedTab: TabKeys;
  setSelectedTab: (key: TabKeys) => void;
  /** Whether the form renders the section tabs switcher, i.e. whether the user can change `selectedTab` */
  showSectionTabs?: boolean;
}

export const CanvasFormTabsContext = createContext<CanvasFormTabsContextResult>({
  selectedTab: 'Required',
  setSelectedTab: () => void 0,
  showSectionTabs: false,
});

/**
 * Holds the selected section tab. Mounted by `KaotoForm`, also exported for field-level tests and consumers
 */
export const CanvasFormTabsProvider: FunctionComponent<
  PropsWithChildren<{ tab?: TabKeys; showSectionTabs?: boolean }>
> = ({ tab = 'Required', showSectionTabs = false, children }) => {
  const [selectedTab, setSelectedTab] = useState<TabKeys>(tab);
  const contextValue = useMemo(
    () => ({ selectedTab, setSelectedTab, showSectionTabs }),
    [selectedTab, showSectionTabs],
  );

  return <CanvasFormTabsContext.Provider value={contextValue}>{children}</CanvasFormTabsContext.Provider>;
};

export const FormTabsModes = {
  Required: 'Shows Required fields only',
  All: 'Shows All fields',
  Modified: 'Shows Modified fields only',
};
