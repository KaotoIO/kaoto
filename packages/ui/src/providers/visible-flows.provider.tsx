import { FunctionComponent, PropsWithChildren, createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { IVisibleFlows, VisibleFlowsReducer, VisualFlowsApi } from '../models/visualization/flows/flows-visibility';
import { EntitiesContext } from './entities.provider';

export interface VisibleFLowsContextResult {
  visibleFlows: IVisibleFlows;
  visualFlowsApi: VisualFlowsApi;
}

export const VisibleFlowsContext = createContext<VisibleFLowsContextResult | undefined>(undefined);

export const VisibleFlowsProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const [visibleFlows, dispatch] = useReducer(VisibleFlowsReducer, {});
  const visualFlowsApi = useMemo(() => {
    return new VisualFlowsApi(dispatch);
  }, [dispatch]);

  useEffect(() => {
    const flows = entitiesContext?.visualEntities.map((visualEntity) => visualEntity.id) ?? [];
    visualFlowsApi.setVisibleFlows(flows);
  }, [entitiesContext, visualFlowsApi]);

  const value = useMemo(() => {
    return {
      visibleFlows,
      visualFlowsApi,
    };
  }, [visibleFlows, visualFlowsApi]);

  return <VisibleFlowsContext.Provider value={value}>{props.children}</VisibleFlowsContext.Provider>;
};
