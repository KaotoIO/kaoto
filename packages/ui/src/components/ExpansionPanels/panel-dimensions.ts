/**
 * Default panel dimensions (at scale factor 1.0)
 * All values are 0.8x of the original sizes to make 0.8 the new default scale
 */

// Standard panel dimensions
export const PANEL_MIN_HEIGHT = 32; // 40 * 0.8
export const PANEL_DEFAULT_HEIGHT = 240; // 300 * 0.8
export const PANEL_COLLAPSED_HEIGHT = 32; // 40 * 0.8

// Parameter input panel dimensions - needs extra height for input + validation icon + error message
export const PANEL_INPUT_HEIGHT = 320; // Increased height to accommodate input with validation icon + 2 line error message
export const PANEL_INPUT_MIN_HEIGHT = 160; // Increased min height for error states

// Target panel dimensions
export const TARGET_PANEL_DEFAULT_HEIGHT = 400; // 500 * 0.8
export const TARGET_PANEL_MIN_HEIGHT = 80; // 100 * 0.8
