import { FunctionComponent, PropsWithChildren, useMemo } from 'react';
import { vi } from 'vitest';

import { CanvasFormTabsContext } from '../providers/canvas-form-tabs.provider';
import { FormComponentFactoryProvider } from '../providers/FormComponentFactoryProvider';
import { ModelContextProvider } from '../providers/ModelProvider';

export const FormWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const tabsValue = useMemo(() => ({ selectedTab: 'All' as const, setSelectedTab: vi.fn() }), []);
  const onPropertyChange = useMemo(() => vi.fn(), []);

  return (
    <CanvasFormTabsContext.Provider value={tabsValue}>
      <FormComponentFactoryProvider>
        <ModelContextProvider model={undefined} onPropertyChange={onPropertyChange}>
          {children}
        </ModelContextProvider>
      </FormComponentFactoryProvider>
    </CanvasFormTabsContext.Provider>
  );
};
