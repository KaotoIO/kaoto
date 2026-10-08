import { Model, Visualization, VisualizationProvider } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';
import { createElement, PropsWithChildren } from 'react';

import { LayoutType } from '../../Canvas/canvas.models';
import { ControllerService } from '../../Canvas/controller.service';
import { useGraphLayout } from './use-graph-layout.hook';

/** Renders the hook inside a real topology controller holding the given graph */
const renderGraphLayout = (graph: Model['graph']) => {
  const controller = new Visualization();
  controller.registerLayoutFactory(ControllerService.baselineLayoutFactory);
  controller.fromModel({ graph });
  const wrapper = ({ children }: PropsWithChildren) => createElement(VisualizationProvider, { controller }, children);

  return renderHook(() => useGraphLayout(), { wrapper });
};

describe('useGraphLayout', () => {
  it('should return the layout from the controller', () => {
    const { result } = renderGraphLayout({ id: 'graph', type: 'graph', layout: LayoutType.DagreVertical });

    expect(result.current).toBe(LayoutType.DagreVertical);
  });

  it('should return default layout when getLayout is not available', () => {
    const { result } = renderGraphLayout({ id: 'graph', type: 'graph' });

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });

  it('should return default layout when getGraph returns undefined', () => {
    /* Without a VisualizationProvider there is no controller, hence no graph */
    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });

  it('should return default layout when getGraph is not available', () => {
    /* Outside of a VisualizationProvider the controller context is empty, so there is no getGraph to call */
    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });
});
