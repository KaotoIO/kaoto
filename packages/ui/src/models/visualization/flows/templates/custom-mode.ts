/**
 * Returns a default custom mode template in YAML format.
 * Used when the user adds a new mode from the canvas.
 */
export const customModeTemplate = (): string => {
  return `slug: new-mode
name: New Mode
description: ""
roleDefinition: ""
whenToUse: ""
groups:
  - read`;
};
