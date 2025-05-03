import { MappingLinksContext, IMappingLinksContext } from '../providers/data-mapping-links.provider';
import { useContext } from 'react';

export const errorMessage = 'useMappingLinks should be called into MappingLinksProvider';

export const useMappingLinks = (): IMappingLinksContext => {
  const ctx = useContext(MappingLinksContext);
  if (!ctx) throw new Error(errorMessage);
  return ctx;
};
