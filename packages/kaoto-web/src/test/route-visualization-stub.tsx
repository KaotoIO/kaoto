import type { RouteVisualizationToolsState } from '@kaoto/kaoto/components';
import * as KaotoComponentsModule from '@kaoto/kaoto/components';
import { act } from '@testing-library/react';
import { useEffect, useImperativeHandle } from 'react';
import { vi } from 'vitest';

/**
 * Replaces the canvas of `@kaoto/kaoto` with a stub that shows the code it was given (`data-code`), whether its
 * hotkeys are off (`data-hotkeys-disabled`) and counts its mounts. Its tools for the host are spies. Undo it with
 * `vi.restoreAllMocks()`.
 */
export const stubRouteVisualization = () => {
  let mounts = 0;
  const tools = { exportImage: vi.fn(), openDocumentation: vi.fn() };
  const RouteVisualizationStub: typeof KaotoComponentsModule.RouteVisualization = ({ code, hotkeysDisabled, ref }) => {
    useEffect(() => {
      mounts++;
    }, []);
    useImperativeHandle(ref, () => tools, []);
    return <div data-testid="route-visualization" data-code={code} data-hotkeys-disabled={hotkeysDisabled} />;
  };
  const spy = vi.spyOn(KaotoComponentsModule, 'RouteVisualization').mockImplementation(RouteVisualizationStub);

  return {
    spy,
    /** How often the canvas was mounted */
    mountCount: () => mounts,
    /** The tools the canvas hands to the host through its ref */
    tools,
    /** Reports the state of the tools through the callback the canvas got last, as the canvas does when it changes */
    reportToolsState: (state: RouteVisualizationToolsState) => {
      act(() => {
        spy.mock.lastCall![0].onToolsStateChange?.(state);
      });
    },
    /** Reports `code` through the code change callback the canvas got last, as if the user edited the route on it */
    editOnCanvas: (code: string) => {
      act(() => {
        spy.mock.lastCall![0].codeChange(code);
      });
    },
  };
};
