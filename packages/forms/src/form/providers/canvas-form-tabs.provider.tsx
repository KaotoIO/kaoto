import { FunctionComponent, PropsWithChildren, createContext, useState } from 'react';

type TabKeys = keyof typeof FormTabsModes;
export interface CanvasFormTabsContextResult {
  selectedTab: TabKeys;
  setSelectedTab: (key: TabKeys) => void;
}

export const CanvasFormTabsContext = createContext<CanvasFormTabsContextResult>({
  selectedTab: 'Required',
  setSelectedTab: () => void 0,
});

/**
 * Used for fetching and injecting the selected tab information from the canvas form
 */
export const CanvasFormTabsProvider: FunctionComponent<PropsWithChildren<{ tab?: TabKeys }>> = ({
  tab = 'Required',
  children,
}) => {
  const [selectedTab, setSelectedTab] = useState<TabKeys>(tab);

  return (
    <CanvasFormTabsContext.Provider
      value={{
        selectedTab,
        setSelectedTab,
      }}
    >
      {children}
    </CanvasFormTabsContext.Provider>
  );
};

export const FormTabsModes = {
  Required: 'Shows Required fields only',
  All: 'Shows All fields',
  Modified: 'Shows Modified fields only',
};
