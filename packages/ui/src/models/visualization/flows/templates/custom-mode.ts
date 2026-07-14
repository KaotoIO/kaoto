import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';
import { CUSTOM_INSTRUCTIONS_PREAMBLE } from '../../../custom-mode/custom-mode-constants';

/**
 * Returns a default custom modes file template in YAML format.
 * The root `customModes` array is required so that
 * `CustomModeResourceFactory` can detect the resource type.
 *
 * customInstructions is pre-populated with the static preamble so that Bob
 * receives the expected tool-routing instructions even for brand-new modes.
 * The user only needs to add their numbered steps after the heading.
 */
export const customModeTemplate = (): string => {
  const instructions = `${CUSTOM_INSTRUCTIONS_PREAMBLE}\n\n# ROLE: New Mode\n\n1. First step\n   - Describe what this step does\n`;
  // YAML literal block scalar: indent each line by 6 spaces (4 for list item, 2 for key)
  const yamlInstructions = instructions
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
  return `customModes:
  - slug: ${getCamelRandomId('new-mode')}
    name: New Mode
    description: ""
    roleDefinition: "Defines who this New Mode is"
    whenToUse: ""
    customInstructions: |
${yamlInstructions}
    groups:
      - read`;
};
