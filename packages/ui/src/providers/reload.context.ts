import { createContext } from 'react';

export const ReloadContext = createContext<
  | {
      reloadPage: () => void;
      lastRender: number;
    }
  | undefined
>(undefined);
