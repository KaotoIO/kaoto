import * as KaotoComponentsModule from '@kaoto/kaoto/components';
import { act } from '@testing-library/react';
import { useEffect } from 'react';
import { vi } from 'vitest';

/**
 * Replaces the canvas of `@kaoto/kaoto` with a stub that shows the code it was given (`data-code`) and counts its
 * mounts. Undo it with `vi.restoreAllMocks()`.
 */
export const stubRouteVisualization = () => {
  let mounts = 0;
  const RouteVisualizationStub: typeof KaotoComponentsModule.RouteVisualization = ({ code }) => {
    useEffect(() => {
      mounts++;
    }, []);
    return <div data-testid="route-visualization" data-code={code} />;
  };
  const spy = vi.spyOn(KaotoComponentsModule, 'RouteVisualization').mockImplementation(RouteVisualizationStub);

  return {
    spy,
    /** How often the canvas was mounted */
    mountCount: () => mounts,
    /** Reports `code` through the code change callback the canvas got last, as if the user edited the route on it */
    editOnCanvas: (code: string) => {
      act(() => {
        spy.mock.lastCall![0].codeChange(code);
      });
    },
  };
};
