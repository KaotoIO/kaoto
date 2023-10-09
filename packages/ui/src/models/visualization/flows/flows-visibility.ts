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

type ToggleFlowVisible = {
  type: 'toggleFlowVisible';
  flowId: string;
  isVisible?: boolean;
};
type ShowAllFlows = {
  type: 'showAllFlows';
  // flowId: string;
};

type HideAllFlows = {
  type: 'hideAllFlows';
};

type SetVisibleFlows = {
  type: 'setVisibleFlows';
  flows: string[];
};

export function VisibleFlowsReducer(
  state: IVisibleFlows,
  action: ToggleFlowVisible | ShowAllFlows | HideAllFlows | SetVisibleFlows,
) {
  switch (action.type) {
    case 'toggleFlowVisible':
      const isFlowVisible = state[action.flowId];
      return {
        ...state,
        [action.flowId]: action.isVisible !== undefined ? action.isVisible : !isFlowVisible,
      };

    case 'showAllFlows':
      return Object.keys(state).reduce((acc: any, flowId: string) => {
        acc[flowId] = true;
        return acc;
      }, {});

    case 'hideAllFlows':
      return Object.keys(state).reduce((acc: any, flowId: string) => {
        acc[flowId] = false;
        return acc;
      }, {});

    case 'setVisibleFlows':
      const visibleFlows = action.flows.reduce(
        (acc, flow, index) => ({
          ...acc,
          /**
           * We keep the previous visibility state if any
           * otherwise, we set the first flow to visible
           * and the rest to invisible
           */
          [flow]: state[flow] ?? index === 0,
        }),
        {} as IVisibleFlows,
      );
      return { ...state, ...visibleFlows };
  }
}

export class VisualFlowsApi {
  private dispatch: React.Dispatch<ToggleFlowVisible | ShowAllFlows | HideAllFlows | SetVisibleFlows>;

  constructor(dispatch: React.Dispatch<ToggleFlowVisible | ShowAllFlows | HideAllFlows | SetVisibleFlows>) {
    this.dispatch = dispatch;
  }

  toggleFlowVisible(flowId: string, isVisible?: boolean) {
    const t: ToggleFlowVisible = { type: 'toggleFlowVisible', flowId: flowId, isVisible: isVisible };
    this.dispatch(t);
  }

  showAllFlows() {
    this.dispatch({ type: 'showAllFlows' });
  }

  hideAllFlows() {
    this.dispatch({ type: 'hideAllFlows' } as HideAllFlows);
  }

  setVisibleFlows(flows: string[]) {
    this.dispatch({ type: 'setVisibleFlows', flows: flows });
  }
}
