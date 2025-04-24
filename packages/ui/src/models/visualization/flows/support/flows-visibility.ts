import { initVisibleFlows } from '../../../../utils/init-visible-flows';

export interface IVisibleFlowsInformation {
  singleFlowId: string | undefined;
  visibleFlowsCount: number;
  totalFlowsCount: number;
  isCanvasEmpty: boolean;
}

export type IVisibleFlows = Record<string, boolean>;

export function getVisibleFlowsInformation(visibleFlows: IVisibleFlows): IVisibleFlowsInformation {
  const flowsArray = Object.entries(visibleFlows);
  const visibleFlowsIdArray = flowsArray.filter((flow) => flow[1]).map((flow) => flow[0]);

  /** If there's only one flow visible, we return its ID */
  if (visibleFlowsIdArray.length === 1) {
    return {
      singleFlowId: visibleFlowsIdArray[0],
      visibleFlowsCount: 1,
      totalFlowsCount: flowsArray.length,
      isCanvasEmpty: flowsArray.length === 0,
    };
  }

  /**
   * Otherwise, we return undefined to signal the UI that there
   * could be more than one or no flow visible
   */
  return {
    singleFlowId: undefined,
    visibleFlowsCount: visibleFlowsIdArray.length,
    totalFlowsCount: flowsArray.length,
    isCanvasEmpty: visibleFlowsIdArray.length === 0 || flowsArray.length === 0,
  };
}

export type VisibleFlowAction =
  | {
      type: 'toggleFlowVisible';
      flowId: string;
    }
  | { type: 'showFlows'; flowIds?: string[] }
  | { type: 'hideFlows'; flowIds?: string[] }
  | { type: 'clearFlows' }
  | { type: 'initVisibleFlows'; flowsIds: string[] }
  | { type: 'renameFlow'; flowId: string; newName: string };

export function VisibleFlowsReducer(state: IVisibleFlows, action: VisibleFlowAction) {
  switch (action.type) {
    case 'toggleFlowVisible':
      return {
        ...state,
        [action.flowId]: !state[action.flowId],
      };

    case 'showFlows':
      return Object.keys(state).reduce((acc: IVisibleFlows, flowId: string) => {
        if (action.flowIds) {
          acc[flowId] = action.flowIds?.includes(flowId) ? true : state[flowId];
        } else {
          acc[flowId] = true;
        }
        return acc;
      }, {});

    case 'hideFlows':
      return Object.keys(state).reduce((acc: IVisibleFlows, flowId: string) => {
        if (action.flowIds) {
          acc[flowId] = action.flowIds?.includes(flowId) ? false : state[flowId];
        } else {
          acc[flowId] = false;
        }
        return acc;
      }, {});

    case 'clearFlows':
      return {};

    case 'initVisibleFlows': {
      return initVisibleFlows(action.flowsIds);
    }

    case 'renameFlow':
      // eslint-disable-next-line no-case-declarations
      const newState = {
        ...state,
        [action.newName]: state[action.flowId],
      };
      delete newState[action.flowId];

      return newState;
  }
}

export class VisualFlowsApi {
  private dispatch: React.Dispatch<VisibleFlowAction>;

  constructor(dispatch: React.Dispatch<VisibleFlowAction>) {
    this.dispatch = dispatch;
  }

  toggleFlowVisible(flowId: string) {
    this.dispatch({ type: 'toggleFlowVisible', flowId });
  }

  showFlows(flowIds?: string[]) {
    this.dispatch({ type: 'showFlows', flowIds });
  }

  hideFlows(flowIds?: string[]) {
    this.dispatch({ type: 'hideFlows', flowIds });
  }

  clearFlows() {
    this.dispatch({ type: 'clearFlows' });
  }

  initVisibleFlows(flowsIds: string[]) {
    this.dispatch({ type: 'initVisibleFlows', flowsIds });
  }

  renameFlow(flowId: string, newName: string) {
    this.dispatch({ type: 'renameFlow', flowId, newName });
  }
}
