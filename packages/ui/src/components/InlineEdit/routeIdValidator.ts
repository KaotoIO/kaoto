import { ValidationResult, ValidationStatus } from '../../models';
import { BaseVisualCamelEntity } from '../../models/visualization/base-visual-entity';

export class RouteIdValidator {
  private static URI_REGEXP = /^[a-z\d]([-a-z\d]*[a-z\d])?(\.[a-z\d]([-a-z\d]*[a-z\d])?)*$/gm;

  /**
   * Verifies that the provided name is valid
   * Regex: [a-z0-9]([-a-z0-9]*[a-z0-9])?(\.[a-z0-9]([-a-z0-9]*[a-z0-9])?)*
   * @param name
   */
  static isNameValidCheck(name: string): boolean {
    const isValid = RouteIdValidator.URI_REGEXP.test(name);
    RouteIdValidator.URI_REGEXP.lastIndex = 0;

    return isValid;
  }

  static validateUniqueName(flowName: string, visualEntities: BaseVisualCamelEntity[]): ValidationResult {
    const errMessages = [];
    const flowsIds = visualEntities.map((flow) => flow.getId());

    const isUnique = !flowsIds.includes(flowName);
    if (!isUnique) {
      errMessages.push('Name must be unique');
    }

    return {
      status: isUnique ? ValidationStatus.Success : ValidationStatus.Error,
      errMessages,
    };
  }
}
