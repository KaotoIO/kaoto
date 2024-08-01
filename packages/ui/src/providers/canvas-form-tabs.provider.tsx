/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, PropsWithChildren, createContext, useState } from 'react';
import { FormTabsModes } from '../components/Visualization/Canvas/canvasformtabs.modes';

export interface CanvasFormTabsContextResult {
  selectedTab: FormTabsModes;
  onTabChange: (
    event: MouseEvent | React.MouseEvent<any, MouseEvent> | React.KeyboardEvent<Element>,
    _isSelected: boolean,
  ) => void;
}
export const CanvasFormTabsContext = createContext<CanvasFormTabsContextResult>({
  selectedTab: FormTabsModes.REQUIRED_FIELDS,
  onTabChange: () => {},
});

/**
 * Used for fetching and injecting the selected tab information from the canvas form
 */
export const CanvasFormTabsProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const [selectedTab, setSelectedTab] = useState<FormTabsModes>(FormTabsModes.REQUIRED_FIELDS);

  const onTabChange = (
    event: MouseEvent | React.MouseEvent<any, MouseEvent> | React.KeyboardEvent<Element>,
    _isSelected: boolean,
  ) => {
    switch (event.currentTarget.id) {
      case FormTabsModes.REQUIRED_FIELDS:
        setSelectedTab(FormTabsModes.REQUIRED_FIELDS);
        break;
      case FormTabsModes.ALL_FIELDS:
        setSelectedTab(FormTabsModes.ALL_FIELDS);
        break;
      case FormTabsModes.USER_MODIFIED:
        setSelectedTab(FormTabsModes.USER_MODIFIED);
    }
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
