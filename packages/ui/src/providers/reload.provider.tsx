import { createContext, FunctionComponent, PropsWithChildren, useCallback, useMemo, useState } from 'react';

export const ReloadContext = createContext<
  | {
      reloadPage: () => void;
      lastRender: number;
    }
  | undefined
>(undefined);

export const ReloadProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const [lastRender, setLastRender] = useState(Date.now());

  const reloadPage = useCallback(() => {
    setLastRender(Date.now());
  }, []);

  const value = useMemo(() => ({ lastRender, reloadPage }), [lastRender, reloadPage]);

  return <ReloadContext.Provider value={value}>{children}</ReloadContext.Provider>;
};
