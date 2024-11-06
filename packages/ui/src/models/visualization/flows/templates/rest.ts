import { getCamelRandomId } from '../../../../camel-utils/camel-random-id';

export const restTemplate = () => {
  return `- rest:
    id: ${getCamelRandomId('rest')}
    openApi:
      specification: petstore-v3.json`;
};
