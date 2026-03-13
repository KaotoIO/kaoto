import { KaotoSchemaDefinition } from '../../../models/kaoto-schema';
import { RestMethods } from '../../../models/special-processors.constants';

export interface AddMethodFormModel {
  method: RestMethods;
  path: string;
  id?: string;
}

export const ADD_METHOD_SCHEMA: KaotoSchemaDefinition['schema'] = {
  type: 'object',
  title: 'Add REST Method',
  properties: {
    method: {
      type: 'string',
      title: 'HTTP Method',
      enum: ['get', 'post', 'put', 'delete', 'patch', 'head'],
      default: 'get',
    },
    path: {
      type: 'string',
      title: 'Path',
      description: 'The REST endpoint path. Example: /{id}',
    },
    id: {
      type: 'string',
      title: 'ID',
      description: 'Optional identifier for the method',
    },
  },
  required: ['method', 'path'],
};
