import { usePanelResizer } from '../../hooks/usePanelResizer';

/** How the Explorer is resized: the CSS variable that holds its width, the width it starts with and its limits in pixels */
export const EXPLORER_WIDTH = {
  cssVariable: '--cs-explorer-inline-size',
  initialWidth: 240,
  minWidth: 160,
  maxWidth: 480,
};

/**
 * The ref for the element that carries the width of the Explorer as `--cs-explorer-inline-size`, and the handler for
 * its resize handle. The project layout carries the variable rather than the Explorer, so that the toolbar can line the
 * view switcher up with the editor next to it.
 */
export const useExplorerWidth = () => usePanelResizer(EXPLORER_WIDTH);
