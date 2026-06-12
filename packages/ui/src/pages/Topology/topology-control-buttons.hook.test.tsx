import { Controller } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';

import { LayoutType } from '../../components/Visualization/Canvas/canvas.models';
import { LocalStorageKeys } from '../../models';
import { AbstractSettingsAdapter, CanvasLayoutDirection, ISettingsModel } from '../../models/settings/settings.model';
import { useTopologyControlButtons } from './topology-control-buttons.hook';

const FIT_PADDING = 80;

const buildController = () => {
  const graph = {
    scaleBy: jest.fn(),
    fit: jest.fn(),
    reset: jest.fn(),
    layout: jest.fn(),
    setLayout: jest.fn(),
  };
  return {
    controller: { getGraph: () => graph } as unknown as Controller,
    graph,
  };
};

const buildAdapter = (canvasLayoutDirection: CanvasLayoutDirection): AbstractSettingsAdapter => ({
  getSettings: () => ({ canvasLayoutDirection }) as ISettingsModel,
  saveSettings: jest.fn(),
});

describe('useTopologyControlButtons', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('omits the layout-toggle buttons when the global setting forces a direction', () => {
    const { controller } = buildController();
    const adapter = buildAdapter(CanvasLayoutDirection.Horizontal);

    const { result } = renderHook(() => useTopologyControlButtons(controller, adapter));

    const ids = result.current.map((b) => b.id);
    expect(ids).not.toContain('topology-control-bar-h_layout-button');
    expect(ids).not.toContain('topology-control-bar-v_layout-button');
  });

  it('includes the horizontal/vertical layout buttons when the user picks per-canvas', () => {
    const { controller } = buildController();
    const adapter = buildAdapter(CanvasLayoutDirection.SelectInCanvas);

    const { result } = renderHook(() => useTopologyControlButtons(controller, adapter));

    const ids = result.current.map((b) => b.id);
    expect(ids).toContain('topology-control-bar-h_layout-button');
    expect(ids).toContain('topology-control-bar-v_layout-button');
  });

  it('horizontal layout button persists the choice and re-runs the layout', () => {
    const { controller, graph } = buildController();
    const adapter = buildAdapter(CanvasLayoutDirection.SelectInCanvas);

    const { result } = renderHook(() => useTopologyControlButtons(controller, adapter));
    const button = result.current.find((b) => b.id === 'topology-control-bar-h_layout-button');
    button!.callback?.(button!.id);

    expect(localStorage.getItem(LocalStorageKeys.CanvasLayout)).toBe(LayoutType.DagreHorizontal);
    expect(graph.setLayout).toHaveBeenCalledWith(LayoutType.DagreHorizontal);
    expect(graph.layout).toHaveBeenCalled();
  });

  it('vertical layout button persists the choice and re-runs the layout', () => {
    const { controller, graph } = buildController();
    const adapter = buildAdapter(CanvasLayoutDirection.SelectInCanvas);

    const { result } = renderHook(() => useTopologyControlButtons(controller, adapter));
    const button = result.current.find((b) => b.id === 'topology-control-bar-v_layout-button');
    button!.callback?.(button!.id);

    expect(localStorage.getItem(LocalStorageKeys.CanvasLayout)).toBe(LayoutType.DagreVertical);
    expect(graph.setLayout).toHaveBeenCalledWith(LayoutType.DagreVertical);
    expect(graph.layout).toHaveBeenCalled();
  });

  it('zoom-in and zoom-out scale the graph by 4/3 and 3/4 respectively', () => {
    const { controller, graph } = buildController();
    const adapter = buildAdapter(CanvasLayoutDirection.Horizontal);

    const { result } = renderHook(() => useTopologyControlButtons(controller, adapter));
    const zoomIn = result.current.find((b) => b.id === 'zoom-in');
    const zoomOut = result.current.find((b) => b.id === 'zoom-out');
    zoomIn!.callback?.(zoomIn!.id);
    zoomOut!.callback?.(zoomOut!.id);

    expect(graph.scaleBy).toHaveBeenNthCalledWith(1, 4 / 3);
    expect(graph.scaleBy).toHaveBeenNthCalledWith(2, 3 / 4);
  });

  it('fit-to-screen calls graph.fit with the topology padding', () => {
    const { controller, graph } = buildController();
    const adapter = buildAdapter(CanvasLayoutDirection.Horizontal);

    const { result } = renderHook(() => useTopologyControlButtons(controller, adapter));
    const fit = result.current.find((b) => b.id === 'fit-to-screen');
    fit!.callback?.(fit!.id);

    expect(graph.fit).toHaveBeenCalledWith(FIT_PADDING);
  });

  it('reset-view resets the graph, re-runs the layout and fits the result', () => {
    const { controller, graph } = buildController();
    const adapter = buildAdapter(CanvasLayoutDirection.Horizontal);

    const { result } = renderHook(() => useTopologyControlButtons(controller, adapter));
    const reset = result.current.find((b) => b.id === 'reset-view');
    reset!.callback?.(reset!.id);

    expect(graph.reset).toHaveBeenCalled();
    expect(graph.layout).toHaveBeenCalled();
    expect(graph.fit).toHaveBeenCalledWith(FIT_PADDING);
  });
});
