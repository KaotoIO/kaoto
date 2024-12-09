import { useContext } from 'react';
import { DataMapperContext, IDataMapperContext } from '../providers/datamapper.provider';

export const errorMessage = 'useDataMapper should be called into DataMapperProvider';

export const useDataMapper = (): IDataMapperContext => {
  const ctx = useContext(DataMapperContext);
  if (!ctx) throw new Error(errorMessage);
  return ctx;
};
