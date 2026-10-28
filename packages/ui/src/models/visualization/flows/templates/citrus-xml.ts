import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

export const testXmlTemplate = () =>
  `<?xml version="1.0" encoding="UTF-8"?>
<test xmlns="http://citrusframework.org/schema/xml/testcase" name="${getCamelRandomId('test')}">
  <actions>
    <create-variables>
      <variable name="user" value="Citrus"/>
    </create-variables>
    <print>
      <message>Hello from \${user}!</message>
    </print>
  </actions>
</test>
`;
