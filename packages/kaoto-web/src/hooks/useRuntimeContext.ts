import { useContext } from 'react';

import { IRuntimeContext, RuntimeContext } from '../context/RuntimeContext';

export const errorMessage = '`useRuntimeContext()` should be called into `RuntimeProvider`';

export function useRuntimeContext(): IRuntimeContext {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error(errorMessage);
  return ctx;
}
