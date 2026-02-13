import { createContext, FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from 'react';

/**
 * Map of [nodeId]: collapsed state (true = collapsed, false/undefined = expanded)
 */
export type CollapsedGroupsState = Record<string, boolean>;

export interface CollapsedGroupsContextResult {
  /** Map of node IDs to their collapsed state */
  collapsedGroups: CollapsedGroupsState;

  /** Set collapsed state for a specific group node */
  setGroupCollapsed: (nodeId: string, isCollapsed: boolean) => void;

  /** Check if a group node is collapsed */
  isGroupCollapsed: (nodeId: string) => boolean;

  /** Clear all collapsed states (useful for reset) */
  clearCollapsedState: () => void;

  /** Remove a specific node from collapsed state (when node is deleted) */
  removeGroupCollapsedState: (nodeId: string) => void;
}

export const CollapsedGroupsContext = createContext<CollapsedGroupsContextResult | null>(null);

export const CollapsedGroupsProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [collapsedGroups, setCollapsedGroups] = useState<CollapsedGroupsState>({});

  const setGroupCollapsed = useCallback((nodeId: string, isCollapsed: boolean) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [nodeId]: isCollapsed,
    }));
  }, []);

  const isGroupCollapsed = useCallback(
    (nodeId: string) => {
      return collapsedGroups[nodeId] ?? false;
    },
    [collapsedGroups],
  );

  const clearCollapsedState = useCallback(() => {
    setCollapsedGroups({});
  }, []);

  const removeGroupCollapsedState = useCallback((nodeId: string) => {
    setCollapsedGroups((prev) => {
      const newState = { ...prev };
      delete newState[nodeId];
      return newState;
    });
  }, []);

  const value = useMemo(
    () => ({
      collapsedGroups,
      setGroupCollapsed,
      isGroupCollapsed,
      clearCollapsedState,
      removeGroupCollapsedState,
    }),
    [collapsedGroups, setGroupCollapsed, isGroupCollapsed, clearCollapsedState, removeGroupCollapsedState],
  );

  return <CollapsedGroupsContext.Provider value={value}>{children}</CollapsedGroupsContext.Provider>;
};
