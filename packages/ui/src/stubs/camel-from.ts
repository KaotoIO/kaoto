import { FromDefinition } from '@kaoto-next/camel-catalog/types';
import { CamelRouteVisualEntity } from '../models/visualization/flows';

/**
 * This is a stub Camel From in YAML format.
 * It is used to test the Canvas component.
 */
export const camelFromYaml = `
- from:
    uri: timer:tutorial
    steps:
    - to:
        uri: direct:my-route
`;

/**
 * This is a stub Camel From in JSON format.
 * It is used to test the Canvas component.
 */
export const camelFromJson: { from: FromDefinition } = {
  from: {
    uri: 'timer:tutorial',
    steps: [
      {
        to: {
          uri: 'direct:my-route',
        },
      },
    ],
  },
};

export const camelFrom = new CamelRouteVisualEntity({ from: camelFromJson.from });
