import { useContext } from 'react';

import { KaotoResourceContext } from '../../providers/kaoto-resource.provider';

export const errorMessage = 'useKaotoResourceContext should be called into KaotoResourceContext';

export function useKaotoResourceContext() {
  const ctx = useContext(KaotoResourceContext);

  if (!ctx) throw new Error(errorMessage);

  return ctx;
}
