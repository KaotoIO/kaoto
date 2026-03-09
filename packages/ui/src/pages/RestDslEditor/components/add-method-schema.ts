import { KaotoSchemaDefinition } from '../../../models/kaoto-schema';
import { RestMethods } from '../../../models/special-processors.constants';

/**
 * Form model for adding a new REST method to a REST service.
 * Contains the HTTP method type, path, and optional identifier.
 */
export interface AddMethodFormModel {
  method: RestMethods;
  path: string;
  id?: string;
}

/**
 * JSON Schema definition for the Add REST Method form.
 * Defines the structure and validation rules for adding new REST methods.
 */
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
      minLength: 1,
    },
    id: {
      type: 'string',
      title: 'ID',
      description: 'Optional identifier for the method',
    },
  },
  required: ['method', 'path'],
};
