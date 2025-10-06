import { resolveSchemaWithRef } from '@kaoto/forms';
import { ExpressionService } from '../../../../../components/Visualization/Canvas/Form/fields/ExpressionField/expression.service';
import { isDefined } from '../../../../../utils/is-defined';
import { KaotoSchemaDefinition } from '../../../../kaoto-schema';
import { VisualComponentSchema } from '../../../base-visual-entity';

interface IValidationResult {
  level: 'error' | 'warning' | 'info';
  type: 'missingRequired';
  parentPath: string;
  propertyName: string;
  message: string;
}

function isMissingRequiredArrayProperty(
  propertySchema: KaotoSchemaDefinition['schema'],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any,
  propertyName: string,
): boolean {
  return propertySchema.type === 'array' && (!Array.isArray(model[propertyName]) || model[propertyName].length === 0);
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

    const validationResult = this.validateRequiredProperties(
      schema.schema,
      schema.definition,
      '',
      schema.schema.definitions,
    );
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
    schema: KaotoSchemaDefinition['schema'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any,
    parentPath: string,
    definitions?: Record<string, KaotoSchemaDefinition['schema']>,
  ): IValidationResult[] {
    const answer = [] as IValidationResult[];

    const resolvedSchema = schema;
    if (Array.isArray(resolvedSchema.anyOf)) {
      let parsedModel = model;
      resolvedSchema.anyOf.forEach((anyOfSchema) => {
        if (isDefined(anyOfSchema.format) && anyOfSchema.format === 'expression') {
          parsedModel = ExpressionService.parseExpressionModel(model);
        }
        answer.push(...this.validateRequiredProperties(anyOfSchema, parsedModel, parentPath, definitions));
      });
    }

    if (Array.isArray(resolvedSchema.oneOf)) {
      resolvedSchema.oneOf.forEach((oneOfSchema) =>
        answer.push(...this.validateRequiredProperties(oneOfSchema, model, parentPath, definitions)),
      );
    }

    if (!schema.properties && schema.$ref) {
      // resolve the ref
      const resolvedSchema = resolveSchemaWithRef(schema, definitions!);
      answer.push(...this.validateRequiredProperties(resolvedSchema, model, parentPath, definitions));
    }

    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propertyName, propertyValue]) => {
        const propertySchema = propertyValue as KaotoSchemaDefinition['schema'];
        const path = parentPath ? `${parentPath}.${propertyName}` : propertyName;

        if (
          Array.isArray(schema.required) &&
          schema.required.includes(propertyName) &&
          propertySchema.default === undefined &&
          propertySchema.$ref === undefined &&
          (!model ||
            model[propertyName] === undefined ||
            isMissingRequiredArrayProperty(propertySchema, model, propertyName))
        ) {
          answer.push({
            level: 'error',
            type: 'missingRequired',
            parentPath: parentPath,
            propertyName: propertyName,
            message: `Missing required property ${propertyName}`,
          });
          return;
        }
        if (model?.[propertyName] && propertySchema.$ref) {
          const resolvedPropertySchema = resolveSchemaWithRef(propertySchema, definitions!);
          answer.push(
            ...this.validateRequiredProperties(resolvedPropertySchema, model[propertyName], path, definitions),
          );
        }
        if (propertySchema.type === 'object') {
          if (model) {
            answer.push(...this.validateRequiredProperties(propertySchema, model[propertyName], path, definitions));
          }
          return;
        }
        // check missing required parameter
      });
    }

    return answer;
  }
}
