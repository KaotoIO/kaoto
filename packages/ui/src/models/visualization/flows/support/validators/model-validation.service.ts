import { KaotoSchemaDefinition } from '../../../../kaoto-schema';
import { VisualComponentSchema } from '../../../base-visual-entity';

interface IValidationResult {
  level: 'error' | 'warning' | 'info';
  type: 'missingRequired' | 'syntaxMismatch';
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
  static validateNodeStatus(schema: VisualComponentSchema | undefined): string {
    if (!schema?.schema) return '';
    let message = '';

    const requiredValidationResult = this.validateRequiredProperties(schema.schema, schema.definition, '');
    const missingProperties = requiredValidationResult
      .filter((result) => result.type === 'missingRequired')
      .map((result) => result.propertyName);

    const syntaxValidationResult = this.validateSyntaxProperties(schema.schema, schema.definition, '');
    const syntaxMismatchProperties = syntaxValidationResult
      .filter((result) => result.type === 'syntaxMismatch')
      .map((result) => result.propertyName);

    if (missingProperties.length > 0) {
      message =
        missingProperties.length > 1
          ? `${missingProperties.length} required parameters are not yet configured: [ ${missingProperties} ]`
          : `1 required parameter is not yet configured: [ ${missingProperties} ]`;
    }

    if (syntaxMismatchProperties.length > 0) {
      message +=
        syntaxMismatchProperties.length > 1
          ? `${syntaxMismatchProperties.length} parameters are configured incorrectly: [ ${syntaxMismatchProperties} ]`
          : `1 parameter is configured incorrectly: [ ${syntaxMismatchProperties} ]` +
            ` cannot contain special characters like '?', ':', '&'`;
    }

    return message;
  }

  private static validateRequiredProperties(
    schema: KaotoSchemaDefinition['schema'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    parentPath: string,
  ): IValidationResult[] {
    const answer = [] as IValidationResult[];

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propertyName, propertyValue]) => {
        const propertySchema = propertyValue as KaotoSchemaDefinition['schema'];
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
          Array.isArray(schema.required) &&
          schema.required.includes(propertyName) &&
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

  private static validateSyntaxProperties(
    schema: KaotoSchemaDefinition['schema'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    parentPath: string,
  ): IValidationResult[] {
    const answer = [] as IValidationResult[];

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propertyName, propertyValue]) => {
        const propertySchema = propertyValue as KaotoSchemaDefinition['schema'];
        // TODO
        if (propertySchema.type === 'array') return;
        if (propertySchema.type === 'object') {
          const path = parentPath ? `${parentPath}.${propertyName}` : propertyName;
          if (model) {
            answer.push(...this.validateSyntaxProperties(propertySchema, model[propertyName], path));
          }
          return;
        }
        // check syntax parameter
        if (propertySchema.pattern && model[propertyName] && model[propertyName].match(/[:&?]/g) !== null) {
          answer.push({
            level: 'error',
            type: 'syntaxMismatch',
            parentPath: parentPath,
            propertyName: propertyName,
            message: `Property ${propertyName} incorrectly configured`,
          });
        }
      });
    }

    return answer;
  }
}
