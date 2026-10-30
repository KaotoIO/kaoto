import { FunctionComponent, PropsWithChildren } from 'react';
import { VirtuosoGridMockContext, VirtuosoMockContext } from 'react-virtuoso';

const VIRTUOSO_MOCK = { viewportHeight: 2000, itemHeight: 10 };
const VIRTUOSO_GRID_MOCK = { viewportHeight: 2000, viewportWidth: 1000, itemHeight: 10, itemWidth: 250 };

// jsdom has no layout, so Virtuoso and VirtuosoGrid need fixed measurements to render the tiles
export const VirtuosoWrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <VirtuosoMockContext.Provider value={VIRTUOSO_MOCK}>
    <VirtuosoGridMockContext.Provider value={VIRTUOSO_GRID_MOCK}>{children}</VirtuosoGridMockContext.Provider>
  </VirtuosoMockContext.Provider>
);
