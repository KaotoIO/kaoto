import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';
import { CustomInstructionsParser } from '../../../custom-mode/custom-instructions-parser';

/**
 * Returns a default custom modes file template in YAML format.
 * The root `customModes` array is required so that
 * `CustomModeResourceFactory` can detect the resource type.
 *
 * customInstructions is produced by CustomInstructionsParser.serialize() so it
 * always contains the static preamble, the placeholder step, and the Hard rules
 * trailer — identical to what every subsequent save produces.
 */
export const customModeTemplate = (): string => {
  const instructions = CustomInstructionsParser.serialize([
    { nodeType: 'step', index: 1, title: 'First step', rawContent: '- Describe what this step does' },
  ]);
  // YAML literal block scalar: indent each line by 6 spaces (4 for list item, 2 for key)
  const yamlInstructions = instructions
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n');
  return `customModes:
  - slug: ${getCamelRandomId('new-mode')}
    name: New Mode
    description: Describe what this mode does
    roleDefinition: "Define the AI's role and expertise"
    whenToUse: Describe when this mode should be used
    customInstructions: |
${yamlInstructions}
    groups:
      - read`;
};
