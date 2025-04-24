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
    visualFlowsApi.showFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'showFlows' });
  });

  it('should hide all flows', () => {
    visualFlowsApi.hideFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'hideFlows' });
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
      action = { type: 'showFlows' };
      const newState = VisibleFlowsReducer(initialState, action);

      expect(newState).toEqual({ flowId1: true, flowId2: true });
    });

    it('should hide all flows', () => {
      const initialState = { flowId1: true, flowId2: true };
      action = { type: 'hideFlows' };
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
      it('should ensure at least one flow is visible on first render', () => {
        const initialState = {};
        const action: VisibleFlowAction = { type: 'initVisibleFlows', flowsIds: ['flowId1', 'flowId2'] };
        const newState = VisibleFlowsReducer(initialState, action);

        expect(newState).toEqual({ flowId1: true, flowId2: false });
      });
    });

    it('should rename flow', () => {
      const initialState = { flowId: true };
      action = { type: 'renameFlow', flowId: 'flowId', newName: 'newName' };
      const newState = VisibleFlowsReducer(initialState, action);

      expect(newState).toEqual({ newName: true });
    });

    it('should show only filtered routes', () => {
      const initialState = {
        route1: false,
        route2: false,
        route3: true,
        route4: false,
      };

      const filteredRoutes = ['route2', 'route4'];

      const action = { type: 'showFlows', flowIds: filteredRoutes };
      const newState = VisibleFlowsReducer(initialState, action as VisibleFlowAction);

      expect(newState).toEqual({
        route1: false,
        route2: true, // updated
        route3: true,
        route4: true, // updated
      });
    });

    it('should hide only filtered routes', () => {
      const initialState = {
        route1: true,
        route2: true,
        route3: true,
        route4: true,
      };

      const filteredRoutes = Object.keys(initialState).filter(
        (routeId) => routeId.includes('route2') || routeId.includes('route4'),
      );

      const action = { type: 'hideFlows', flowIds: filteredRoutes };
      const newState = VisibleFlowsReducer(initialState, action as VisibleFlowAction);

      expect(newState).toEqual({
        route1: true,
        route2: false, // updated
        route3: true,
        route4: false, // updated
      });
    });
  });
});
