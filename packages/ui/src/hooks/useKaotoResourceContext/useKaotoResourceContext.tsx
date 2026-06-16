import { useContext } from 'react';

import { KaotoResourceContext, KaotoResourceContextResult } from '../../providers/kaoto-resource.provider';

export const errorMessage = 'useKaotoResourceContext should be called into KaotoResourceContext';

export function useKaotoResourceContext(): Required<KaotoResourceContextResult> {
  const ctx = useContext(KaotoResourceContext);

  if (!ctx?.kaotoResource) throw new Error(errorMessage);

  return ctx as Required<KaotoResourceContextResult>;
}
