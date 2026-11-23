import { useSyncExternalStore } from 'react';

import { isDarkThemeActive, subscribeToDarkTheme } from '../utils/theme';

/** Whether the content area is dark; re-renders when the theme setting or, while it is `system`, the OS changes */
export const useDarkTheme = (): boolean => useSyncExternalStore(subscribeToDarkTheme, isDarkThemeActive);
