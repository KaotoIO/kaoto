import { createContext } from 'react';

/** True while the canvas model resolves; the drawn graph is then stale, so its menus must not act on it */
export const CanvasResolvingContext = createContext<boolean>(false);
