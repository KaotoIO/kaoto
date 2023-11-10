import { useContext } from 'react';
import { SourceCodeContext } from '../../providers/source-code.provider';

export const errorMessage = 'useSourceCodeContext should be called into SourceCodeProvider';

export function useSourceCodeContext() {
  const ctx = useContext(SourceCodeContext);

  if (!ctx) throw new Error(errorMessage);

  return ctx;
}
