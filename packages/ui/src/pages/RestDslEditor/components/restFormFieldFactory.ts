import { CustomFieldsFactory } from '@kaoto/forms';

import { MediaTypeField } from '../../../components/Visualization/Canvas/Form/fields/MediaTypeField/MediaTypeField';
import { RestRouteEndpointField } from './RestRouteEndpointField';

export const restFormFieldFactory: CustomFieldsFactory = (schema) => {
  if (schema.type === 'object' && schema.title === 'To') {
    return RestRouteEndpointField;
  }

  if (schema.type === 'string' && (schema.title === 'Consumes' || schema.title === 'Produces')) {
    return MediaTypeField;
  }

  return undefined;
};
