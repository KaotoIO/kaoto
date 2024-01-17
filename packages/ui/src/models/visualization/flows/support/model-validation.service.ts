import { IVisualizationNode, VisualComponentSchema } from '../../base-visual-entity';
import { NodeStatus } from '@patternfly/react-topology';
import { JSONSchemaType } from 'ajv';

export interface IValidationResult {
  level: 'error' | 'warning' | 'info';
  type: 'missingRequired';
  parentPath: string;
  propertyName: string;
  message: string;
}

export class ModelValidationService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static validateModel(schema: JSONSchemaType<unknown>, model: any, parentPath: string): IValidationResult[] {
    const answer = [] as IValidationResult[];
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([propertyName, propertyValue]) => {
        const propertySchema = propertyValue as JSONSchemaType<unknown>;
        // TODO
        if (propertySchema.type === 'array') return;
        if (propertySchema.type === 'object') {
          const path = parentPath ? `${parentPath}.${propertyName}` : propertyName;
          if (model) {
            answer.push(...ModelValidationService.validateModel(propertySchema, model[propertyName], path));
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static validateNodeStatus(schema: VisualComponentSchema | undefined, model: any, vizNode: IVisualizationNode): void {
    if (!schema?.schema) return;

    const validationResult = ModelValidationService.validateModel(schema.schema, model, '');
    const missingProperties = validationResult
      .filter((result) => result.type === 'missingRequired')
      .map((result) => result.propertyName);
    if (missingProperties.length > 0) {
      const message =
        missingProperties.length > 1
          ? `${missingProperties.length} required properties are not yet configured: [ ${missingProperties} ]`
          : `1 required property is not yet configured: [ ${missingProperties} ]`;
      vizNode.setNodeStatus(NodeStatus.warning, message);
    } else {
      vizNode.setNodeStatus(NodeStatus.default, undefined);
    }
  }
}
