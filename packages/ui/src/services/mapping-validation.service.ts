import { IField, PrimitiveDocument } from '../models/datamapper/document';
import { Types } from '../models/datamapper/types';
import {
  FieldItemNodeData,
  MappingNodeData,
  NodeData,
  SourceNodeDataType,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
} from '../models/datamapper/visualization';

/**
 * Result returned by mapping validation operations.
 *
 * When `isValid` is `false` and the pair was rejected due to a user-correctable
 * condition (e.g. unselected choice, container/terminal mismatch), `errorMessage`
 * carries a human-readable explanation.  Same-side drops are silently rejected
 * (`isValid: false`, no `errorMessage`).
 *
 * `sourceNode` and `targetNode` are populated on cross-side pairs regardless of
 * validity, so callers can use them for highlighting or further processing.
 */
export interface ValidationResult {
  /** Whether the drag-and-drop pair is a valid mapping operation. */
  isValid: boolean;
  /** Human-readable explanation when the pair is invalid due to a user-correctable condition. */
  errorMessage?: string;
  /** The resolved source node for this pair. */
  sourceNode?: SourceNodeDataType;
  /** The resolved target node for this pair. */
  targetNode?: TargetNodeData;
}

/**
 * Stateless service that validates drag-and-drop mapping pairs in the DataMapper.
 *
 * Validation is split into two levels:
 * - **Node-level** ({@link validateMappingPair}): determines which node is source/target,
 *   and short-circuits when the target is not a field (e.g. a document root drop).
 * - **Field-level** ({@link validateFieldPair}): applies ordered schema rules
 *   (choice selection, container compatibility) to the underlying `IField` values.
 */
export class MappingValidationService {
  /**
   * Validates a drag-and-drop pair at the node level.
   *
   * Rejects same-side drops silently (no `errorMessage`). For cross-side pairs,
   * identifies which node is source and which is target, then delegates to
   * {@link validateFieldPair} when both sides resolve to concrete fields.
   * Document-root targets bypass field-level validation and are always accepted.
   *
   * @param fromNode - The node being dragged.
   * @param toNode - The node being dropped onto.
   * @returns A {@link ValidationResult} describing whether the pair is mappable.
   */
  static validateMappingPair(fromNode: NodeData, toNode: NodeData): ValidationResult {
    if ((fromNode.isSource && toNode.isSource) || (!fromNode.isSource && !toNode.isSource)) {
      return { isValid: false };
    }

    const sourceNode = (fromNode.isSource ? fromNode : toNode) as SourceNodeDataType;
    const targetNode = (fromNode.isSource ? toNode : fromNode) as TargetNodeData;

    if (targetNode instanceof MappingNodeData || targetNode instanceof TargetDocumentNodeData) {
      return { isValid: true, sourceNode, targetNode };
    }
    if (!(targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData)) {
      return { isValid: false, sourceNode, targetNode };
    }

    const sourceField = 'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : sourceNode.field;
    const targetField = targetNode.field;

    const fieldValidation = MappingValidationService.validateFieldPair(sourceField, targetField);
    return { ...fieldValidation, sourceNode, targetNode };
  }

  private static readonly validationRules: ReadonlyArray<(source: IField, target: IField) => ValidationResult> = [
    MappingValidationService.validateChoiceRules,
    MappingValidationService.validateContainerRules,
  ];

  /**
   * Validates a pair of `IField` values against all registered schema rules.
   *
   * Rules are applied in order; the first failing rule short-circuits and its
   * result is returned.  Currently enforced rules are:
   * 1. Choice selection — a choice target must have a member selected before mapping.
   * 2. Container/terminal compatibility — a container field cannot be mapped to a terminal field and vice versa.
   *
   * @param sourceField - The source schema field.
   * @param targetField - The target schema field.
   * @returns A {@link ValidationResult} with `isValid: true` when all rules pass.
   */
  static validateFieldPair(sourceField: IField, targetField: IField): ValidationResult {
    for (const rule of MappingValidationService.validationRules) {
      const result = rule(sourceField, targetField);
      if (!result.isValid) return result;
    }
    return { isValid: true };
  }

  private static validateContainerRules(source: IField, target: IField): ValidationResult {
    /** While choice node is also a container, it has its own rule in {@link validateChoiceRules()} */
    if (source.isChoice) return { isValid: true };

    if (MappingValidationService.isContainer(source) !== MappingValidationService.isContainer(target)) {
      return {
        isValid: false,
        errorMessage: 'Cannot map between a container field and a terminal field.',
      };
    }
    return { isValid: true };
  }

  private static isContainer(source: IField) {
    return source.type === Types.Container;
  }

  private static validateChoiceRules(_source: IField, target: IField): ValidationResult {
    if (target.isChoice === true && target.selectedMemberIndex === undefined) {
      return {
        isValid: false,
        errorMessage: 'Cannot map to an unselected choice. Please select a specific choice member first.',
      };
    }
    return { isValid: true };
  }
}
