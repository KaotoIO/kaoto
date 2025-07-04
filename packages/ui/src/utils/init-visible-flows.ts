export type IVisibleFlows = Record<string, boolean>;

const ensureAtLeastOneVisibleFlow = (state: IVisibleFlows) => {
  const entries = Object.keys(state);
  if (entries.length > 0 && Object.values(state).every((visible) => !visible)) {
    state[entries[0]] = true;
  }
  return state;
};

export const initVisibleFlows = (flowsIds: string[], state: IVisibleFlows = {}): IVisibleFlows => {
  const visibleFlows = flowsIds.reduce((flows, id) => {
    flows[id] = state[id] ?? true;
    return flows;
  }, {} as IVisibleFlows);

  return ensureAtLeastOneVisibleFlow(visibleFlows);
};
