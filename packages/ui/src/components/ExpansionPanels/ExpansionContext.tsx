import { createContext } from 'react';

export interface PanelData {
  id: string;
  height: number;
  minHeight: number;
  collapsedHeight: number; // Height when collapsed (just the header, ~40-50px)
  element: HTMLDivElement;
  isExpanded: boolean;
  order: number; // Track registration order to maintain stable panel positions
}

interface ExpansionContextValue {
  register: (
    id: string,
    minHeight: number,
    defaultHeight: number,
    element: HTMLDivElement,
    isExpanded: boolean,
  ) => void;
  unregister: (id: string) => void;
  resize: (id: string, newHeight: number, isTopHandle?: boolean) => void;
  setExpanded: (id: string, isExpanded: boolean) => void;
  queueLayoutChange: (callback: () => void) => void;
}

export const ExpansionContext = createContext<ExpansionContextValue>({
  register: () => {},
  unregister: () => {},
  resize: () => {},
  setExpanded: () => {},
  queueLayoutChange: () => {},
});
