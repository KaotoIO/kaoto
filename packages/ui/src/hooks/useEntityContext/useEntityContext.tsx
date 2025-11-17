import { useContext } from 'react';

import { EntitiesContext } from '../../providers/entities.provider';

export const errorMessage = 'useEntityContext should be called into EntitiesProvider';

export function useEntityContext() {
  const ctx = useContext(EntitiesContext);

  if (!ctx) throw new Error(errorMessage);

  return ctx;
}
