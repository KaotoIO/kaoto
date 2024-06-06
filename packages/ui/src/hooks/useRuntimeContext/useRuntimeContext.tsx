import { useContext } from 'react';
import { RuntimeContext } from '../../providers/runtime.provider';

export const errorMessage = '`useRuntimeContext()` should be called into `RuntimeProvider`';

export function useRuntimeContext() {
  const ctx = useContext(RuntimeContext);

  if (!ctx) throw new Error(errorMessage);

  return ctx;
}
