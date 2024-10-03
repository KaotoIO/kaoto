import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

export const routeTemplate = () => {
  return `- route:
    id: ${getCamelRandomId('route')}
    from:
      id: ${getCamelRandomId('from')}
      uri: timer
      parameters:
        period: "1000"
        timerName: template
      steps:
        - log:
            id: ${getCamelRandomId('log')}
            message: \${body}`;
};
