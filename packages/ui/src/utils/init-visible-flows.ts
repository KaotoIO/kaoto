import { IVisibleFlows } from '../models/visualization/flows/support/flows-visibility';

export const initVisibleFlows = (flowsIds: string[]) => {
  return flowsIds.reduce((flows, id, index) => {
    flows[id] = index === 0;
    return flows;
  }, {} as IVisibleFlows);
};
