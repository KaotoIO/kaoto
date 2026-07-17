import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

/**
 * Returns a default custom modes file template in YAML format.
 * The root `customModes` array is required so that
 * `CustomModeResourceFactory` can detect the resource type.
 */
export const customModeTemplate = (): string => {
  return `customModes:
  - slug: ${getCamelRandomId('new-mode')}
    name: New Mode
    description: ""
    roleDefinition: "Defines who this New Mode is"
    whenToUse: ""
    groups:
      - read`;
};
