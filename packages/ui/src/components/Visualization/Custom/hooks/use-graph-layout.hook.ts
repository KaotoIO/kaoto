import { useVisualizationController } from '@patternfly/react-topology';

import { LayoutType } from '../../Canvas/canvas.models';

/**
 * Custom hook to get the current graph layout.
 *
 * @returns The current graph layout (LayoutType.DagreVertical or LayoutType.DagreHorizontal)
 */
export const useGraphLayout = (): LayoutType => {
  const controller = useVisualizationController();
  const graph = controller?.getGraph?.();
  return (graph?.getLayout?.() as LayoutType) ?? LayoutType.DagreHorizontal;
};
