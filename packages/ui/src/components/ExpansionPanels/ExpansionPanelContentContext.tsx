import { createContext, RefObject } from 'react';

/**
 * Context that provides a reference to the ExpansionPanel's content element.
 * This allows descendants (like VirtuosoWithVisibility) to access the actual
 * scroll container for IntersectionObserver, ensuring proper visibility tracking.
 */
export const ExpansionPanelContentContext = createContext<RefObject<HTMLElement | null> | null>(null);
