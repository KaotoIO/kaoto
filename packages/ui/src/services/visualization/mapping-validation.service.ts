import { IField, PrimitiveDocument } from '../../models/datamapper/document';
import { MappingParentType, MappingTree, VariableItem } from '../../models/datamapper/mapping';
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
  SourceVariableNodeData,
  TargetAbstractFieldNodeData,
  TargetDocumentNodeData,
  TargetFieldNodeData,
  TargetNodeData,
  UnknownMappingNodeData,
} from '../../models/datamapper/visualization';
import { DocumentService } from '../document/document.service';
import { FieldMatchingService } from '../mapping/field-matching.service';

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
    if (fromNode.isSource === toNode.isSource) {
      return { isValid: false };
    }

    const sourceNode = (fromNode.isSource ? fromNode : toNode) as SourceNodeDataType;
    const targetNode = (fromNode.isSource ? toNode : fromNode) as TargetNodeData;

    const nodeError = MappingValidationService.validateNodeTypes(sourceNode, targetNode);
    if (nodeError !== undefined) return { ...nodeError, sourceNode, targetNode };

    const targetField = MappingValidationService.resolveTargetField(targetNode);
    if (targetField === null) return { isValid: true, sourceNode, targetNode };
    if (targetField === undefined) return { isValid: false, sourceNode, targetNode };

    const sourceField =
      'document' in sourceNode ? (sourceNode.document as PrimitiveDocument) : (sourceNode as { field: IField }).field;
    return { ...MappingValidationService.validateFieldPair(sourceField, targetField), sourceNode, targetNode };
  }

  private static validateNodeTypes(
    sourceNode: SourceNodeDataType,
    targetNode: TargetNodeData,
  ): ValidationResult | undefined {
    if (sourceNode instanceof ChoiceFieldNodeData && !sourceNode.choiceField) {
      const choiceError = MappingValidationService.validateSourceChoiceWrapper(sourceNode, targetNode);
      if (choiceError) return choiceError;
    }

    if (sourceNode instanceof SourceVariableNodeData) {
      const targetField = MappingValidationService.resolveTargetField(targetNode);
      if (targetField) {
        for (const rule of [
          MappingValidationService.validateChoiceRules,
          MappingValidationService.validateAbstractRules,
        ]) {
          const result = rule(targetField, targetField);
          if (!result.isValid) return result;
        }
      }
      return MappingValidationService.validateVariableScope(sourceNode.variable, targetNode) ?? { isValid: true };
    }

    return undefined;
  }

  private static resolveTargetField(targetNode: TargetNodeData): IField | null | undefined {
    if (targetNode instanceof TargetDocumentNodeData) return null;
    if (targetNode instanceof MappingNodeData && !(targetNode instanceof FieldItemNodeData)) return null;
    if (targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData) return targetNode.field;
    return undefined;
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
   * 2. Abstract selection — an abstract target must have a concrete candidate selected.
   * 3. Container/terminal compatibility — a container field cannot be mapped to a terminal field
   *    and vice versa; two containers must have at least one matching child pair.
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

    if (source.type === Types.Array || target.type === Types.Array) {
      return {
        isValid: false,
        errorMessage: 'Cannot map a JSON array wrapper field directly. Map its children instead.',
      };
    }

    const sourceIsContainer = MappingValidationService.isContainer(source);
    const targetIsContainer = MappingValidationService.isContainer(target);
    const anyTypeInvolved = source.type === Types.AnyType || target.type === Types.AnyType;

    if (sourceIsContainer !== targetIsContainer && !anyTypeInvolved) {
      return {
        isValid: false,
        errorMessage: 'Cannot map between a container field and a terminal field.',
      };
    }

    if (
      sourceIsContainer &&
      targetIsContainer &&
      DocumentService.hasChildren(source) &&
      DocumentService.hasChildren(target)
    ) {
      const matchingChildren = FieldMatchingService.findMatchingChildren(source, target);
      if (matchingChildren.length === 0) {
        return {
          isValid: false,
          errorMessage:
            'Cannot map containers with no matching children. The source and target structures have no compatible fields to map.',
        };
      }
    }

    return { isValid: true };
  }

  private static validateSourceChoiceWrapper(
    sourceNode: ChoiceFieldNodeData,
    targetNode: TargetNodeData,
  ): ValidationResult | undefined {
    if (!(targetNode instanceof TargetFieldNodeData || targetNode instanceof FieldItemNodeData)) {
      return {
        isValid: false,
        errorMessage: 'Drop a choice node onto a target field to create a conditional mapping.',
      };
    }
    if (sourceNode.field.fields?.some((m) => MappingValidationService.isContainer(m))) {
      return {
        isValid: false,
        errorMessage: 'Cannot map a choice containing complex elements. Map individual members instead.',
      };
    }
    return undefined;
  }

  /**
   * Checks whether a variable is in scope for the given target node.
   *
   * XSLT scope rule: `xsl:variable` is visible only to **following siblings** and their
   * descendants within the same parent element. A target mapping that precedes the variable
   * declaration in the same parent is therefore out of scope.
   *
   * Two-step check:
   * 1. Container check — target's mapping path must start with `varParent.nodePath`
   *    (target is a descendant of the same container that owns the variable).
   * 2. Sibling-order check — the direct child of `varParent` that contains (or is) the
   *    target must appear **after** the variable in `varParent.children`.
   *
   * Root-level variables (`variable.parent instanceof MappingTree`) skip both checks —
   * they are always in scope everywhere.
   */
  private static outOfScope(variableName: string): ValidationResult {
    return { isValid: false, errorMessage: `Variable "$${variableName}" is not in scope for this target field.` };
  }

  private static validateVariableScope(
    variable: VariableItem,
    targetNode: TargetNodeData,
  ): ValidationResult | undefined {
    const varParent = variable.parent;
    if (!varParent) return MappingValidationService.outOfScope(variable.name);
    if (varParent instanceof MappingTree) return undefined;

    const targetMappingPath = MappingValidationService.resolveTargetMappingPath(targetNode);
    if (!targetMappingPath) return MappingValidationService.outOfScope(variable.name);

    const scopeBoundary = varParent.nodePath.toString();
    if (!targetMappingPath.startsWith(scopeBoundary)) return MappingValidationService.outOfScope(variable.name);

    return MappingValidationService.checkSiblingOrder(variable, varParent, targetMappingPath, scopeBoundary);
  }

  private static checkSiblingOrder(
    variable: VariableItem,
    varParent: MappingParentType,
    targetMappingPath: string,
    scopeBoundary: string,
  ): ValidationResult | undefined {
    const rest = targetMappingPath.slice(scopeBoundary.length);
    const siblingId = rest.split('/').find((s) => s.length > 0);
    if (!siblingId) return undefined;

    if (!varParent?.children) return undefined;
    const varIndex = varParent.children.indexOf(variable);
    const siblingIndex = varParent.children.findIndex((c) => c.id === siblingId);
    if (siblingIndex !== -1 && siblingIndex <= varIndex) {
      return MappingValidationService.outOfScope(variable.name);
    }
    return undefined;
  }

  /**
   * Returns the nodePath string of the nearest mapped ancestor for the given target node.
   * For already-mapped nodes, returns the node's own mapping nodePath.
   * For unmapped fields, walks up the visual parent chain until a mapped node is found.
   * Returns `undefined` if no mapping context exists (e.g. the document root is not mapped).
   */
  private static resolveTargetMappingPath(targetNode: TargetNodeData): string | undefined {
    if (targetNode.mapping && !(targetNode.mapping instanceof MappingTree)) {
      return targetNode.mapping.nodePath.toString();
    }
    // Unmapped field — walk visual parent chain
    let parent = 'parent' in targetNode ? (targetNode as TargetFieldNodeData).parent : undefined;
    while (parent) {
      if (parent.mapping && !(parent.mapping instanceof MappingTree)) {
        return parent.mapping.nodePath.toString();
      }
      parent = 'parent' in parent ? (parent as TargetFieldNodeData).parent : undefined;
    }
    return undefined;
  }

  private static isContainer(field: IField) {
    return field.type === Types.Container;
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
    if (target.wrapperKind === 'abstract' && target.selectedMemberQName === undefined) {
      return {
        isValid: false,
        errorMessage: 'Cannot map to an unselected abstract element. Please select a concrete candidate first.',
      };
    }
    return { isValid: true };
  }
}
