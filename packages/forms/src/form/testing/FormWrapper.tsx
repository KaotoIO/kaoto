import { FunctionComponent, PropsWithChildren } from 'react';
import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';
import { FormComponentFactoryProvider } from '../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../providers/ModelProvider';

export const FormWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <CanvasFormTabsContext.Provider value={{ selectedTab: 'All', setSelectedTab: jest.fn() }}>
    <FormComponentFactoryProvider>
      <ModelContextProvider model={undefined} onPropertyChange={jest.fn()}>
        {children}
      </ModelContextProvider>
    </FormComponentFactoryProvider>
  </CanvasFormTabsContext.Provider>
);
