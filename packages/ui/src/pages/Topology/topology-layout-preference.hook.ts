import { useMemo } from 'react';

import { LayoutType } from '../../components/Visualization/Canvas/canvas.models';
import { LocalStorageKeys } from '../../models';
import { AbstractSettingsAdapter } from '../../models/settings/settings.model';
import { getInitialLayout } from '../../utils/get-initial-layout';

export interface TopologyLayoutPreference {
  /** Forced layout from the global setting, or `undefined` when the user picks per-canvas. */
  settingsLayout: LayoutType | undefined;
  /** The layout that should be applied right now. */
  activeLayout: LayoutType;
}

// LayoutType is a `const enum`, so its values can't be enumerated at runtime —
// list them explicitly for the validation check.
const VALID_LAYOUTS = new Set<string>([LayoutType.DagreHorizontal, LayoutType.DagreVertical]);

const isValidLayout = (value: string | null): value is LayoutType => value !== null && VALID_LAYOUTS.has(value);

/**
 * Resolves the layout direction for the topology view. Honors the global
 * `canvasLayoutDirection` setting first, then the user's last per-canvas
 * choice (persisted in localStorage), and finally falls back to horizontal.
 */
export const useTopologyLayoutPreference = (settingsAdapter: AbstractSettingsAdapter): TopologyLayoutPreference => {
  // Depend on the actual setting value rather than the adapter reference so a
  // saveSettings() on the same adapter still triggers a recompute.
  const canvasLayoutDirection = settingsAdapter.getSettings().canvasLayoutDirection;
  const settingsLayout = useMemo(() => getInitialLayout(canvasLayoutDirection), [canvasLayoutDirection]);
  const activeLayout = useMemo(() => {
    if (settingsLayout) {
      return settingsLayout;
    }
    const stored = localStorage.getItem(LocalStorageKeys.CanvasLayout);
    return isValidLayout(stored) ? stored : LayoutType.DagreHorizontal;
  }, [settingsLayout]);

  return { settingsLayout, activeLayout };
};
