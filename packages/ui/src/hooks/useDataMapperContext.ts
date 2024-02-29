import { useContext } from 'react';
import { DataMapperContext, IDataMapperContext } from '../providers';

export const errorMessage = 'useDataMapperContext should be called into DataMapperContextProvider';

export const useDataMapperContext = (): IDataMapperContext => {
  const ctx = useContext(DataMapperContext);
  if (!ctx) throw new Error(errorMessage);
  return ctx;
};
