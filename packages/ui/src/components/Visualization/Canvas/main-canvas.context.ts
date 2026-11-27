import { createContext } from 'react';

export interface MainCanvasContextValue {
  /** `true` while every interaction with the graph is blocked, see `CanvasProps.blocked` */
  blocked: boolean;
}

/**
 * Marks the graph that belongs to the main canvas (`#canvas-main`), and tells it whether that canvas is blocked.
 *
 * Several surfaces can be mounted at once from the same component factory — the off-screen one of the image export,
 * for instance — so a graph cannot assume that the main canvas is its own. Only the surface rendered by `Canvas`
 * gets this context; everything else sees `undefined` and leaves `#canvas-main` alone.
 */
export const MainCanvasContext = createContext<MainCanvasContextValue | undefined>(undefined);
