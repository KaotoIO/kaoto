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

type VisibleFlowAction =
  | {
      type: 'toggleFlowVisible';
      flowId: string;
      isVisible?: boolean;
    }
  | { type: 'showAllFlows' }
  | { type: 'hideAllFlows' }
  | { type: 'clearFlows' }
  | { type: 'setVisibleFlows'; flows: string[] }
  | { type: 'initVisibleFlows'; visibleFlows: IVisibleFlows }
  | { type: 'renameFlow'; flowId: string; newName: string };

export function VisibleFlowsReducer(state: IVisibleFlows, action: VisibleFlowAction) {
  let visibleFlows;
  switch (action.type) {
    case 'toggleFlowVisible':
      return {
        ...state,
        [action.flowId]: action.isVisible !== undefined ? action.isVisible : !state[action.flowId],
      };

    case 'showAllFlows':
      return Object.keys(state).reduce((acc: IVisibleFlows, flowId: string) => {
        acc[flowId] = true;
        return acc;
      }, {});

    case 'hideAllFlows':
      return Object.keys(state).reduce((acc: IVisibleFlows, flowId: string) => {
        acc[flowId] = false;
        return acc;
      }, {});

    case 'setVisibleFlows':
      visibleFlows = action.flows.reduce(
        (acc, flow, index) => ({
          ...acc,
          /**
           * We keep the previous visibility state if any
           * otherwise, we set the first flow to visible
           * and the rest to invisible
           */
          [flow]: acc[flow] ?? index === 0,
        }),
        {} as IVisibleFlows,
      );
      return { ...state, ...visibleFlows };
    case 'clearFlows':
      return {};
    case 'initVisibleFlows':
      return { ...action.visibleFlows };

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

  toggleFlowVisible(flowId: string, isVisible?: boolean) {
    this.dispatch({ type: 'toggleFlowVisible', flowId, isVisible });
  }

  showAllFlows() {
    this.dispatch({ type: 'showAllFlows' });
  }

  hideAllFlows() {
    this.dispatch({ type: 'hideAllFlows' });
  }

  setVisibleFlows(flows: string[]) {
    this.dispatch({ type: 'setVisibleFlows', flows: flows });
  }

  clearFlows() {
    this.dispatch({ type: 'clearFlows' });
  }

  initVisibleFlows(visibleFlows: IVisibleFlows) {
    this.dispatch({ type: 'initVisibleFlows', visibleFlows: visibleFlows });
  }

  renameFlow(flowId: string, newName: string) {
    this.dispatch({ type: 'renameFlow', flowId, newName });
  }
}
