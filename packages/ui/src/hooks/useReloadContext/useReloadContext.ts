import { useContext } from 'react';

import { ReloadContext } from '../../providers/reload.provider';

export const errorMessage = '`useReloadContext()` should be called into `ReloadProvider`';

export function useReloadContext() {
  const ctx = useContext(ReloadContext);

  if (!ctx) throw new Error(errorMessage);

  return ctx;
}
