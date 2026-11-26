import { FunctionComponent, PropsWithChildren, useMemo } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';

interface VirtuosoTestViewportProps {
  /** The height of the visible part of the list, in pixels */
  viewportHeight?: number;
  /** The height of every row, in pixels */
  itemHeight?: number;
}

/**
 * jsdom has no layout, so Virtuoso needs fixed sizes to know which rows to render. The defaults show every row of the
 * test projects; a smaller viewport leaves rows out of view, as a long tree in the browser does.
 */
export const VirtuosoTestViewport: FunctionComponent<PropsWithChildren<VirtuosoTestViewportProps>> = ({
  viewportHeight = 2000,
  itemHeight = 32,
  children,
}) => {
  const sizes = useMemo(() => ({ viewportHeight, itemHeight }), [viewportHeight, itemHeight]);
  return <VirtuosoMockContext.Provider value={sizes}>{children}</VirtuosoMockContext.Provider>;
};
