import { FunctionComponent, PropsWithChildren } from 'react';
import { EntitiesProvider, VisibleFLowsContextResult, VisibleFlowsContext } from '../providers';

interface ITestProviderWrapper extends PropsWithChildren {
  visibleFlows?: VisibleFLowsContextResult;
}

export const TestProvidersWrapper: FunctionComponent<ITestProviderWrapper> = (props) => {
  const visibleFlows = props.visibleFlows || ({ visibleFlows: {} } as unknown as VisibleFLowsContextResult);

  return (
    <EntitiesProvider>
      <VisibleFlowsContext.Provider value={visibleFlows}>{props.children}</VisibleFlowsContext.Provider>
    </EntitiesProvider>
  );
};
