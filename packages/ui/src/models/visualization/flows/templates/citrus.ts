import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

/**
 * Generates a default Citrus test template in YAML format.
 *
 * The template includes:
 * - A unique test name with random ID
 * - A createVariables action that sets a "user" variable to "Citrus"
 * - A print action that outputs a greeting message using the variable
 *
 * This serves as a starting point for creating new Citrus tests in the visual editor.
 *
 * @returns A YAML string representing a basic Citrus test template
 */
export const testTemplate = () => {
  return `name: ${getCamelRandomId('test')}
actions:
  - createVariables:
      variables:
        - name: "user"
          value: "Citrus"
  - print:
      message: Hello from \${user}!`;
};
