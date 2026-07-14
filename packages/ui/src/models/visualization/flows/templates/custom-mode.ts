/**
 * Returns a default custom modes file template in YAML format.
 * The root `customModes` array is required so that
 * `CustomModeResourceFactory` can detect the resource type.
 */
export const customModeTemplate = (): string => {
  return `customModes:
  - slug: new-mode
    name: New Mode
    description: ""
    roleDefinition: ""
    whenToUse: ""
    groups:
      - read`;
};
