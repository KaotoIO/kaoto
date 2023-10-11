export type IVisibleFlows = Record<string, boolean>;

// toggleFlowVisible: (flowId: string, isVisible?: boolean) => void;
// showAllFlows: () => void;
// hideAllFlows: () => void;
// setVisibleFlows: (flows: IVisibleFlows) => void;

export function VisualFlowsReducer(state: IVisibleFlows, action) {
    switch (action.type) {
        case 'toggleFlowVisible':
            return {
                ...state,
                [action.flowId]: isFlowVisible,
            };

        case 'showAllFlows':
            return Object.keys(state).reduce((acc, flowId) => {
                acc[flowId] = true;
                return acc;
            }, {});

        case 'hideAllFlows':
            return Object.keys(state).reduce((acc, flowId) => {
                acc[flowId] = false;
                return acc;
            }, {});

        case 'setVisibleFlows':
            return action.flows;
}



export class VisualFlowsApi {
    constructor(dispatch) {}

    toggleFlowVisible(flowId: string, isVisible?: boolean) {
        dispatch({ type: 'toggleFlowVisible', flowId, isVisible });
    }

    showAllFlows() {
        dispatch({ type: 'showAllFlows' });
    }

    hideAllFlows() {
        dispatch({ type: 'hideAllFlows' });
    }

    setVisibleFlows(flows: IVisibleFlows) {
        dispatch({ type: 'setVisibleFlows', flows });
    }
}
