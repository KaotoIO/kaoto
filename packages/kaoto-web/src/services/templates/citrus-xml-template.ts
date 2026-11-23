/**
 * The starter template of a Citrus XML test. The catalog has no such template, so it is kept here, as a copy of
 * `testXmlTemplate` of `@kaoto/kaoto`, with the `__KAOTO_ID__` placeholder in place of its random test id.
 */
export const CITRUS_XML_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<test xmlns="http://citrusframework.org/schema/xml/testcase" name="test-__KAOTO_ID__">
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
