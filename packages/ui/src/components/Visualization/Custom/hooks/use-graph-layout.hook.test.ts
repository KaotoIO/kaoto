import { useVisualizationController } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';
import type { Mock } from 'vitest';

import { LayoutType } from '../../Canvas/canvas.models';
import { useGraphLayout } from './use-graph-layout.hook';

vi.mock('@patternfly/react-topology', () => ({
  useVisualizationController: vi.fn(),
}));

describe('useGraphLayout', () => {
  it('should return the layout from the controller', () => {
    const mockController = {
      getGraph: vi.fn(() => ({
        getLayout: vi.fn(() => LayoutType.DagreVertical),
      })),
    };
    (useVisualizationController as Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreVertical);
  });

  it('should return default layout when getLayout is not available', () => {
    const mockController = {
      getGraph: vi.fn(() => ({
        getLayout: undefined,
      })),
    };
    (useVisualizationController as Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });

  it('should return default layout when getGraph returns undefined', () => {
    const mockController = {
      getGraph: vi.fn(() => undefined),
    };
    (useVisualizationController as Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });

  it('should return default layout when getGraph is not available', () => {
    const mockController = {
      getGraph: undefined,
    };
    (useVisualizationController as Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });
});
