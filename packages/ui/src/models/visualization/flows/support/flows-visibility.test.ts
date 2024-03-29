import { VisualFlowsApi } from './flows-visibility';

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

  it('should toggle flow visibility with a given flag', () => {
    visualFlowsApi.toggleFlowVisible('flowId', true);

    expect(dispatch).toHaveBeenCalledWith({ type: 'toggleFlowVisible', flowId: 'flowId', isVisible: true });
  });

  it('should show all flows', () => {
    visualFlowsApi.showAllFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'showAllFlows' });
  });

  it('should hide all flows', () => {
    visualFlowsApi.hideAllFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'hideAllFlows' });
  });

  it('should set visible flows', () => {
    visualFlowsApi.setVisibleFlows(['flowId']);

    expect(dispatch).toHaveBeenCalledWith({ type: 'setVisibleFlows', flows: ['flowId'] });
  });

  it('should clear flows', () => {
    visualFlowsApi.clearFlows();

    expect(dispatch).toHaveBeenCalledWith({ type: 'clearFlows' });
  });

  it('should init visible flows', () => {
    visualFlowsApi.initVisibleFlows({ flowId: true });

    expect(dispatch).toHaveBeenCalledWith({ type: 'initVisibleFlows', visibleFlows: { flowId: true } });
  });

  it('should rename flow', () => {
    visualFlowsApi.renameFlow('flowId', 'newName');

    expect(dispatch).toHaveBeenCalledWith({ type: 'renameFlow', flowId: 'flowId', newName: 'newName' });
  });
});
