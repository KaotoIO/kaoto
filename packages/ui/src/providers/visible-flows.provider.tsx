import { FunctionComponent, PropsWithChildren, createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import {
  IVisibleFlows,
  VisibleFlowsReducer,
  VisualFlowsApi,
} from '../models/visualization/flows/support/flows-visibility';
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
    const flows: IVisibleFlows = {};

    entitiesContext?.visualEntities.forEach((visualEntity) => (flows[visualEntity.id] = visibleFlows[visualEntity.id]));
    const hiddenAll = Object.values(flows).every((visible) => !visible);
    if (hiddenAll && (entitiesContext?.visualEntities.length ?? 0) > 0) {
      flows[entitiesContext!.visualEntities[0].id] = true;
    }

    visualFlowsApi.initVisibleFlows(flows);
  }, [entitiesContext, visualFlowsApi]);

  const value = useMemo(() => {
    return {
      visibleFlows,
      visualFlowsApi,
    };
  }, [visibleFlows, visualFlowsApi]);

  return <VisibleFlowsContext.Provider value={value}>{props.children}</VisibleFlowsContext.Provider>;
};
