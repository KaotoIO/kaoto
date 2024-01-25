import { JSONSchemaType } from 'ajv';
import { VisualComponentSchema } from '../../../base-visual-entity';

interface IValidationResult {
  level: 'error' | 'warning' | 'info';
  type: 'missingRequired';
  parentPath: string;
  propertyName: string;
  message: string;
}

/**
 * Service for validating the model of a node.
 * Ideally, this should be done with a JSON schema validator, like ajv, but for our use case, it's not possible,
 * since we need to validate the model against the schema, but also against the definition of the node.
 *
 * TODO: This service should be reshaped as a Manager entity which register many validators, and each validator
 * should be able to validate a specific aspect of the model. This way, we could have a validator for the schema,
 * and another one for the definition.
 *
 * For instance, the schema validator could be used to validate the model against the schema, and the definition
 * validator could be used to validate the model against the definition, and check if the model is complete. In addition to that,
 * we could validate the model against external constraints, like whether a property is defined in an environment variable or a
 * property file.
 */
export class ModelValidationService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static validateNodeStatus(schema: VisualComponentSchema | undefined): string {
    if (!schema?.schema) return '';
    let message = '';

    const validationResult = this.validateRequiredProperties(schema.schema, schema.definition, '');
    const missingProperties = validationResult
      .filter((result) => result.type === 'missingRequired')
      .map((result) => result.propertyName);

    if (missingProperties.length > 0) {
      message =
        missingProperties.length > 1
          ? `${missingProperties.length} required parameters are not yet configured: [ ${missingProperties} ]`
          : `1 required parameter is not yet configured: [ ${missingProperties} ]`;
    }

    return message;
  }

  private static validateRequiredProperties(
    schema: JSONSchemaType<unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    parentPath: string,
  ): IValidationResult[] {
    const answer = [] as IValidationResult[];

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propertyName, propertyValue]) => {
        const propertySchema = propertyValue as JSONSchemaType<unknown>;
        // TODO
        if (propertySchema.type === 'array') return;
        if (propertySchema.type === 'object') {
          const path = parentPath ? `${parentPath}.${propertyName}` : propertyName;
          if (model) {
            answer.push(...this.validateRequiredProperties(propertySchema, model[propertyName], path));
          }
          return;
        }
        // check missing required parameter
        if (
          schema.required?.includes(propertyName) &&
          propertySchema.default === undefined &&
          (!model || !model[propertyName])
        ) {
          answer.push({
            level: 'error',
            type: 'missingRequired',
            parentPath: parentPath,
            propertyName: propertyName,
            message: `Missing required property ${propertyName}`,
          });
        }
      });
    }

    return answer;
  }
}
