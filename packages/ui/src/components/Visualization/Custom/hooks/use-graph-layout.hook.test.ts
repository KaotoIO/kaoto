import { useVisualizationController } from '@patternfly/react-topology';
import { renderHook } from '@testing-library/react';

import { LayoutType } from '../../Canvas/canvas.models';
import { useGraphLayout } from './use-graph-layout.hook';

jest.mock('@patternfly/react-topology', () => ({
  useVisualizationController: jest.fn(),
}));

describe('useGraphLayout', () => {
  it('should return the layout from the controller', () => {
    const mockController = {
      getGraph: jest.fn(() => ({
        getLayout: jest.fn(() => LayoutType.DagreVertical),
      })),
    };
    (useVisualizationController as jest.Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreVertical);
  });

  it('should return default layout when getLayout is not available', () => {
    const mockController = {
      getGraph: jest.fn(() => ({
        getLayout: undefined,
      })),
    };
    (useVisualizationController as jest.Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });

  it('should return default layout when getGraph returns undefined', () => {
    const mockController = {
      getGraph: jest.fn(() => undefined),
    };
    (useVisualizationController as jest.Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });

  it('should return default layout when getGraph is not available', () => {
    const mockController = {
      getGraph: undefined,
    };
    (useVisualizationController as jest.Mock).mockReturnValue(mockController);

    const { result } = renderHook(() => useGraphLayout());

    expect(result.current).toBe(LayoutType.DagreHorizontal);
  });
});
