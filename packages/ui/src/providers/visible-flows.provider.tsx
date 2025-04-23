import { FunctionComponent, PropsWithChildren, createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import {
  IVisibleFlows,
  VisibleFlowsReducer,
  VisualFlowsApi,
} from '../models/visualization/flows/support/flows-visibility';
import { initVisibleFlows } from '../utils';
import { EntitiesContext } from './entities.provider';
import { usePrevious } from '../hooks';

export interface VisibleFlowsContextResult {
  visibleFlows: IVisibleFlows;
  allFlowsVisible: boolean;
  visualFlowsApi: VisualFlowsApi;
}

export const VisibleFlowsContext = createContext<VisibleFlowsContextResult | undefined>(undefined);

export const VisibleFlowsProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const entitiesContext = useContext(EntitiesContext);
  const visualEntitiesIds = useMemo(
    () => entitiesContext?.visualEntities.map((entity) => entity.id) ?? [],
    [entitiesContext?.visualEntities],
  );

  const [visibleFlows, dispatch] = useReducer(VisibleFlowsReducer, {}, () => initVisibleFlows(visualEntitiesIds));
  const allFlowsVisible = Object.values(visibleFlows).every((visible) => visible);
  const visualFlowsApi = useMemo(() => {
    return new VisualFlowsApi(dispatch);
  }, [dispatch]);

  const previousVisualEntitiesIds = usePrevious(visualEntitiesIds);

  useEffect(() => {
    const hasSameIds =
      Array.isArray(previousVisualEntitiesIds) &&
      previousVisualEntitiesIds.length === visualEntitiesIds.length &&
      previousVisualEntitiesIds.every((id) => visualEntitiesIds.includes(id));

    if (!hasSameIds) {
      visualFlowsApi.initVisibleFlows(visualEntitiesIds);
    }
  }, [visualEntitiesIds, visualFlowsApi]);

  const value = useMemo(() => {
    return {
      visibleFlows,
      allFlowsVisible,
      visualFlowsApi,
    };
  }, [allFlowsVisible, visibleFlows, visualFlowsApi]);

  return <VisibleFlowsContext.Provider value={value}>{props.children}</VisibleFlowsContext.Provider>;
};
