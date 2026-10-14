import { createContext, Dispatch, SetStateAction, useContext } from 'react';

import { BreadcrumbLink } from '../components/Breadcrumbs/Breadcrumbs';

export type ViewMode = 'design' | 'code' | 'topology';

export interface IIntegrationHeaderContext {
  breadcrumbItems: BreadcrumbLink[];
  current: string;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  setBreadcrumbItems: Dispatch<SetStateAction<BreadcrumbLink[]>>;
  setCurrent: Dispatch<SetStateAction<string>>;
}

export const IntegrationHeaderContext = createContext<IIntegrationHeaderContext | null>(null);

export const useIntegrationHeader = (): IIntegrationHeaderContext | null => {
  return useContext(IntegrationHeaderContext);
};
