import { usePanelResizer } from '../../hooks/usePanelResizer';

/** The width of the Explorer in pixels: where it starts and how far it can be dragged */
export const EXPLORER_WIDTH = { initialWidth: 240, minWidth: 160, maxWidth: 480 };

/**
 * The width of the Explorer and the handler that resizes it. Held by the project layout rather than the Explorer, so
 * that the toolbar can line the view switcher up with the editor next to it.
 */
export const useExplorerWidth = () => usePanelResizer(EXPLORER_WIDTH);
