import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

export const routeXmlTemplate = () =>
  `<?xml version="1.0" encoding="UTF-8"?>
<routes xmlns="http://camel.apache.org/schema/spring">
  <route id="${getCamelRandomId('route')}">
    <from uri="timer:template?period=1000"/>
    <log message="\${body}"/>
  </route>
</routes>`;
