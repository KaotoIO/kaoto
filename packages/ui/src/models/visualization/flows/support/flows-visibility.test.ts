import { VisibleFlowAction, VisibleFlowsReducer, VisualFlowsApi } from './flows-visibility';

describe('VisualFlowsApi', () => {
  let dispatch: jest.Mock;
  let visualFlowsApi: VisualFlowsApi;

  beforeEach(() => {
    dispatch = jest.fn();
    visualFlowsApi = new VisualFlowsApi(dispatch);
  });

  it('should toggle flow visibility', () => {
    visualFlowsApi.toggleFlowVisible('flowId');

    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleFlowVisible', flowId: 'flowId', isVisible: undefined });
  });

  it('should show all flows', () => {
    visualFlowsApi.showAllFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'showAllFlows' });
  });

  it('should hide all flows', () => {
    visualFlowsApi.hideAllFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'hideAllFlows' });
  });

  it('should clear flows', () => {
    visualFlowsApi.clearFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'clearFlows' });
  });

  it('should init visible flows', () => {
    visualFlowsApi.initVisibleFlows(['flowId']);

    expect(dispatch).toHaveBeenCalledWith({ type: 'initVisibleFlows', flowsIds: ['flowId'] });
  });

  it('should rename flow', () => {
    visualFlowsApi.renameFlow('flowId', 'newName');

    expect(dispatch).toHaveBeenCalledWith({ type: 'renameFlow', flowId: 'flowId', newName: 'newName' });
  });

  describe('VisibleFlowsReducer', () => {
    let action: VisibleFlowAction;

    it('should toggle flow visibility', () => {
      const initialState = { flowId: true };
      action = { type: 'toggleFlowVisible', flowId: 'flowId' };
      const newState = VisibleFlowsReducer(initialState, action);

      expect(newState).toEqual({ flowId: false });
    });

    it('should show all flows', () => {
      const initialState = { flowId1: false, flowId2: false };
      action = { type: 'showAllFlows' };
      const newState = VisibleFlowsReducer(initialState, action);

      expect(newState).toEqual({ flowId1: true, flowId2: true });
    });

    it('should hide all flows', () => {
      const initialState = { flowId1: true, flowId2: true };
      action = { type: 'hideAllFlows' };
      const newState = VisibleFlowsReducer(initialState, action);

      expect(newState).toEqual({ flowId1: false, flowId2: false });
    });

    it('should clear flows', () => {
      const initialState = { flowId1: true, flowId2: true };
      action = { type: 'clearFlows' };
      const newState = VisibleFlowsReducer(initialState, action);

      expect(newState).toEqual({});
    });

    describe('initVisibleFlows', () => {
      it('should not create a new state if all flows already exists', () => {
        const initialState = { flowId1: true, flowId2: false };
        action = { type: 'initVisibleFlows', flowsIds: ['flowId1', 'flowId2'] };
        const newState = VisibleFlowsReducer(initialState, action);

        expect(newState).toBe(initialState);
      });
      it('should ensure at least one flow is visible on first render', () => {
        const initialState = {};
        const action: VisibleFlowAction = { type: 'initVisibleFlows', flowsIds: ['flowId1', 'flowId2'] };
        const newState = VisibleFlowsReducer(initialState, action);

        expect(newState).toEqual({ flowId1: true, flowId2: false });
      });

      it('should preserve visibility state on subsequent renders', () => {
        const initialState = { flowId1: false, flowId2: true };
        const action: VisibleFlowAction = { type: 'initVisibleFlows', flowsIds: ['flowId1', 'flowId2'] };
        const newState = VisibleFlowsReducer(initialState, action);

        expect(newState).toEqual({ flowId1: false, flowId2: true });
      });

      it('should keep existing visibility', () => {
        const initialState = { flowId1: false, flowId2: true };
        action = { type: 'initVisibleFlows', flowsIds: ['flowId1', 'flowId2'] };
        const newState = VisibleFlowsReducer(initialState, action);

        expect(newState).toEqual({ flowId1: false, flowId2: true });
      });
    });

    it('should rename flow', () => {
      const initialState = { flowId: true };
      action = { type: 'renameFlow', flowId: 'flowId', newName: 'newName' };
      const newState = VisibleFlowsReducer(initialState, action);

      expect(newState).toEqual({ newName: true });
    });
  });
});
