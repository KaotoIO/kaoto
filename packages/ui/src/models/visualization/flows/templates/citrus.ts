import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

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
