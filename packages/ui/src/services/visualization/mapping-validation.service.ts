import { IField, PrimitiveDocument } from '../../models/datamapper/document';
import { Types } from '../../models/datamapper/types';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  DocumentNodeData,
  FieldItemNodeData,
  MappingNodeData,
  NodeData,
  SourceNodeDataType,
  TargetAbstractFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  UnknownMappingNodeData,
} from '../../models/datamapper/visualization';

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
 * Stateless service that governs drag-and-drop operations in the DataMapper.
 *
 * Methods follow a naming convention that reflects their role in the DnD pipeline:
 *
 * - **`is*()`** methods return a plain `boolean` and are used to **disable** DnD
 *   at the structural level. When they return `false`, the drag or drop is silently
 *   prevented — no hover effect, no error feedback.
 *   - {@link isDraggable} — gates whether a node can initiate a drag.
 *   - {@link isDroppable} — gates whether a node can accept a drop.
 *
 * - **`validate*()`** methods return a {@link ValidationResult} and are used when
 *   DnD is **enabled** but the operation may be invalid. They provide an
 *   `errorMessage` for user-facing feedback (e.g. invalid-drop hover effect,
 *   error toast on drop).
 *   - {@link validateMappingPair} — validates a specific drag-and-drop pair.
 *   - {@link validateFieldPair} — validates the underlying schema fields.
 */
export class MappingValidationService {
  /**
   * Whether the given node can initiate a drag operation.
   *
   * Returns `false` for nodes that should never be dragged: placeholder nodes
   * ({@link UnknownMappingNodeData}, {@link AddMappingNodeData}), unselected
   * abstract wrappers, and non-primitive document roots. Selected abstract
   * candidates (with {@link AbstractFieldNodeData.abstractField} set) remain
   * draggable.
   *
   * @param node - The node to check.
   */
  static isDraggable(node: NodeData): boolean {
    if (node instanceof UnknownMappingNodeData) return false;
    if (node instanceof AddMappingNodeData) return false;
    if ((node instanceof AbstractFieldNodeData || node instanceof TargetAbstractFieldNodeData) && !node.abstractField)
      return false;
    if (node instanceof DocumentNodeData && !node.isPrimitive) return false;
    return true;
  }

  /**
   * Whether the target node can accept a drop from the active node.
   *
   * Returns `false` for placeholder nodes and for same-side drops
   * (source-to-source or target-to-target), which are silently ignored.
   * When no drag is active ({@link activeNode} is `undefined`), all
   * non-placeholder nodes are droppable.
   *
   * @param activeNode - The currently dragged node, or `undefined` if no drag is active.
   * @param targetNode - The potential drop target.
   */
  static isDroppable(activeNode: NodeData | undefined, targetNode: NodeData): boolean {
    if (targetNode instanceof UnknownMappingNodeData) return false;
    if (targetNode instanceof AddMappingNodeData) return false;
    if (activeNode?.isSource === targetNode.isSource) return false;
    return true;
  }

  /**
   * Validates a drag-and-drop pair at the node level.
   *
   * Rejects same-side drops silently (no `errorMessage`). For cross-side pairs,
   * identifies which node is source and which is target, then delegates to
   * {@link validateFieldPair} when both sides resolve to concrete fields.
   * Document-root and mapping-node targets bypass field-level validation and
   * are always accepted.
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

    if (sourceNode instanceof ChoiceFieldNodeData && !sourceNode.choiceField) {
      if (!(targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData)) {
        return {
          isValid: false,
          sourceNode,
          targetNode,
          errorMessage: 'Drop a choice node onto a target field to create a conditional mapping.',
        };
      }
    }

    if (targetNode instanceof TargetDocumentNodeData) {
      return { isValid: true, sourceNode, targetNode };
    }
    if (targetNode instanceof MappingNodeData && !(targetNode instanceof FieldItemNodeData)) {
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

  private static readonly pairValidationRules: ReadonlyArray<(source: IField, target: IField) => ValidationResult> = [
    MappingValidationService.validateChoiceRules,
    MappingValidationService.validateAbstractRules,
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
    for (const rule of MappingValidationService.pairValidationRules) {
      const result = rule(sourceField, targetField);
      if (!result.isValid) return result;
    }
    return { isValid: true };
  }

  private static validateContainerRules(source: IField, target: IField): ValidationResult {
    if (source.wrapperKind) return { isValid: true };

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
    if (target.wrapperKind === 'choice' && target.selectedMemberIndex === undefined) {
      return {
        isValid: false,
        errorMessage: 'Cannot map to an unselected choice. Please select a specific choice member first.',
      };
    }
    return { isValid: true };
  }

  private static validateAbstractRules(_source: IField, target: IField): ValidationResult {
    if (target.wrapperKind === 'abstract' && target.selectedMemberIndex === undefined) {
      return {
        isValid: false,
        errorMessage: 'Cannot map to an unselected abstract element. Please select a concrete candidate first.',
      };
    }
    return { isValid: true };
  }
}
