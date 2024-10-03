/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, PropsWithChildren, createContext, useState } from 'react';
import { FormTabsModes } from '../components/Visualization/Canvas/Form/canvasformtabs.modes';

export interface CanvasFormTabsContextResult {
  selectedTab: keyof typeof FormTabsModes;
  onTabChange: (event: MouseEvent | React.MouseEvent<any, MouseEvent> | React.KeyboardEvent<Element>) => void;
}
export const CanvasFormTabsContext = createContext<CanvasFormTabsContextResult | undefined>(undefined);

/**
 * Used for fetching and injecting the selected tab information from the canvas form
 */
export const CanvasFormTabsProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [selectedTab, setSelectedTab] = useState<keyof typeof FormTabsModes>('Required');

  const onTabChange = (event: MouseEvent | React.MouseEvent<any, MouseEvent> | React.KeyboardEvent<Element>) => {
    setSelectedTab(event.currentTarget.id);
  };

  return (
    <CanvasFormTabsContext.Provider
      value={{
        selectedTab,
        onTabChange,
      }}
    >
      {props.children}
    </CanvasFormTabsContext.Provider>
  );
};
