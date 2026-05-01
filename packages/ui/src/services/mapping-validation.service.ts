import { IField } from '../models/datamapper/document';
import { DocumentService } from './document/document.service';
import { MappingPairService } from './mapping-pair.service';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Service for validating mapping operations between source and target fields.
 * Centralizes all mapping validation rules to ensure consistent behavior across the application.
 *
 * Validation Rules:
 * - Case 1: Terminal field → Container field = INVALID (cannot map simple value to complex structure)
 * - Case 2: Container → Container with NO matching children = INVALID (no compatible fields to map)
 * - Case 3: Terminal → Terminal = VALID (direct value mapping)
 * - Case 4: Container → Terminal = VALID (can extract/serialize container to simple value)
 * - Case 5: Container → Container with matching children = VALID (can map matching fields)
 */
export class MappingValidationService {
  /** Validates if a mapping between source and target fields is allowed. */
  static validateMapping(sourceField: IField, targetField: IField): ValidationResult {
    const sourceHasChildren = DocumentService.hasChildren(sourceField);
    const targetHasChildren = DocumentService.hasChildren(targetField);

    // Case 1: Terminal → Container (INVALID)
    if (!sourceHasChildren && targetHasChildren) {
      return {
        isValid: false,
        errorMessage:
          'Cannot map a terminal field to a container field. A simple value cannot be mapped to a complex structure.',
      };
    }

    // Case 3: Terminal → Terminal (VALID)
    if (!sourceHasChildren && !targetHasChildren) {
      return { isValid: true };
    }

    // Case 4: Container → Terminal (VALID)
    if (sourceHasChildren && !targetHasChildren) {
      return { isValid: true };
    }

    // Case 5 & Case 2: Container → Container
    // Need to check if there are matching children
    return this.validateContainerMapping(sourceField, targetField);
  }

  /** Validates container-to-container mapping by checking for matching children. */
  private static validateContainerMapping(sourceField: IField, targetField: IField): ValidationResult {
    // Find matching children between source and target
    const matchingChildren = MappingPairService.findMatchingChildren(sourceField, targetField);

    // Case 2: Container → Container with NO matches (INVALID)
    if (matchingChildren.length === 0) {
      return {
        isValid: false,
        errorMessage:
          'Cannot map containers with no matching children. The source and target structures have no compatible fields to map.',
      };
    }

    // Case 5: Container → Container with matches (VALID)
    return { isValid: true };
  }
}
