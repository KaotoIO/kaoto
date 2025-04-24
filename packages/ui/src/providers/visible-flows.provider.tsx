import { FunctionComponent, PropsWithChildren, createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import {
  IVisibleFlows,
  VisibleFlowsReducer,
  VisualFlowsApi,
} from '../models/visualization/flows/support/flows-visibility';
import { initVisibleFlows, isSameArray } from '../utils';
import { EntitiesContext } from './entities.provider';

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

  const visibleFlowsIds = useMemo(() => Object.keys(visibleFlows), [visibleFlows]);

  useEffect(() => {
    const hasSameIds = isSameArray(visualEntitiesIds, visibleFlowsIds);

    /**
     * If the ids of the visual entities are different from the ids of the visible flows,
     * we need to initialize the visible flows with the new ids.
     * This is important because the visible flows are stored in the state and
     * if the ids change, we need to update the state to reflect the new ids.
     */
    if (!hasSameIds) {
      visualFlowsApi.initVisibleFlows(visualEntitiesIds);
    }
  }, [visibleFlowsIds, visualEntitiesIds, visualFlowsApi]);

  const value = useMemo(() => {
    return {
      visibleFlows,
      allFlowsVisible,
      visualFlowsApi,
    };
  }, [allFlowsVisible, visibleFlows, visualFlowsApi]);

  return <VisibleFlowsContext.Provider value={value}>{props.children}</VisibleFlowsContext.Provider>;
};
