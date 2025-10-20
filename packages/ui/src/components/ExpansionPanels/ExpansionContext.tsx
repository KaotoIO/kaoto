import { createContext } from 'react';

export interface PanelData {
  id: string;
  height: number;
  minHeight: number;
  element: HTMLDivElement;
  isExpanded: boolean;
}

interface ExpansionContextValue {
  register: (id: string, minHeight: number, defaultHeight: number, element: HTMLDivElement, isExpanded: boolean) => void;
  unregister: (id: string) => void;
  resize: (id: string, newHeight: number) => void;
  setExpanded: (id: string, isExpanded: boolean) => void;
}

export const ExpansionContext = createContext<ExpansionContextValue>({
  register: () => {},
  unregister: () => {},
  resize: () => {},
  setExpanded: () => {},
});
