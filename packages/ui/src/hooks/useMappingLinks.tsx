import { useContext } from 'react';

import { IMappingLinksContext, MappingLinksContext } from '../providers/data-mapping-links.provider';

export const errorMessage = 'useMappingLinks should be called into MappingLinksProvider';

export const useMappingLinks = (): IMappingLinksContext => {
  const ctx = useContext(MappingLinksContext);
  if (!ctx) throw new Error(errorMessage);
  return ctx;
};
