import { computeAddFieldCandidates } from '../../components/Document/actions/FieldContextMenu/menu-utils';
import {
  ChooseItem,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  IfItem,
  MappingItem,
  OtherwiseItem,
  UnknownMappingItem,
  ValueSelector,
  WhenItem,
} from '../../models/datamapper/mapping';
import {
  IMappingAction,
  IMappingContextMenuAction,
  MappingActionGroup,
  MappingActionKind,
} from '../../models/datamapper/mapping-action';
import {
  AddMappingNodeData,
  FieldItemNodeData,
  ForEachCapableNodeData,
  MappingNodeData,
  TargetDocumentNodeData,
  TargetNodeData,
  VariableNodeData,
} from '../../models/datamapper/visualization';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { DocumentService } from '../document/document.service';
import { MappingActionService } from './mapping-action.service';
import { VisualizationUtilService } from './visualization-util.service';

/**
 * Static service that owns the action registry for the DataMapper
 * visualization layer.
 *
 * Determines which actions ({@link MappingActionKind}) are available for a
 * given target node and provides context menu item definitions. Delegates
 * actual mutations to {@link MappingActionService}.
 */
export class MappingActionRegistryService {
  private static allowForEachCurrentGroup(nodeData: TargetNodeData): boolean {
    let current: TargetNodeData | undefined = nodeData;
    while (current) {
      if (current instanceof MappingNodeData) {
        if (current.mapping instanceof ForEachGroupItem) return true;
        if (current.mapping instanceof ForEachItem && current.mapping.expression === 'current-group()') return false;
      }
      current = 'parent' in current ? current.parent : undefined;
    }
    return false;
  }

  private static isUnselectedWrapperField(n: TargetNodeData): boolean {
    return VisualizationUtilService.isUnselectedChoiceField(n) || VisualizationUtilService.isUnselectedAbstractField(n);
  }

  private static mappingIsOneOf(...types: Array<abstract new (...args: never[]) => MappingItem>) {
    return (n: TargetNodeData): boolean =>
      VisualizationUtilService.isMappingNode(n) && types.some((t) => n.mapping instanceof t);
  }

  private static isContextMenuAction(def: IMappingAction): def is IMappingContextMenuAction {
    return 'getLabel' in def;
  }

  private static readonly ACTION_REGISTRY: (IMappingAction | IMappingContextMenuAction)[] = [
    {
      key: MappingActionKind.ContextMenu,
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return true;
        if (n instanceof TargetDocumentNodeData) return n.isPrimitive;
        if (VisualizationUtilService.isFieldNode(n)) return true;
        return (
          VisualizationUtilService.isMappingNode(n) &&
          !MappingActionRegistryService.mappingIsOneOf(ValueSelector, UnknownMappingItem)(n)
        );
      },
    },
    {
      key: MappingActionKind.Delete,
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return false;
        if (n instanceof FieldItemNodeData)
          return (
            (n.mapping instanceof FieldItem && n.mapping.isUserCreated) || MappingActionService.hasValueSelector(n)
          );
        if (VisualizationUtilService.isFieldNode(n) || n instanceof TargetDocumentNodeData)
          return MappingActionService.hasValueSelector(n);
        return VisualizationUtilService.isMappingNode(n);
      },
    },
    {
      key: MappingActionKind.Sort,
      testId: 'transformation-actions-sort',
      getLabel: (n) => {
        const mapping = n.mapping;
        if (mapping instanceof ForEachItem && mapping.sortItems?.length > 0) {
          return 'Edit Sort';
        }
        return 'Configure Sort';
      },
      apply: (_n, { openModal }) => {
        openModal(MappingActionKind.Sort);
      },
      isAllowed: MappingActionRegistryService.mappingIsOneOf(ForEachItem),
    },
    {
      key: MappingActionKind.ForEachGroupConfig,
      testId: 'transformation-actions-foreach-group-config',
      getLabel: () => 'Configure for-each-group',
      apply: (_n, { openModal }) => {
        openModal(MappingActionKind.ForEachGroupConfig);
      },
      isAllowed: MappingActionRegistryService.mappingIsOneOf(ForEachGroupItem),
    },
    {
      key: MappingActionKind.Comment,
      testId: 'transformation-actions-comment',
      getLabel: (n) => (n.mapping instanceof MappingItem && n.mapping.comment ? 'Edit Comment' : 'Add Comment'),
      apply: (_n, { openModal }) => {
        openModal(MappingActionKind.Comment);
      },
      isAllowed: (n) => n.mapping instanceof MappingItem,
    },
    {
      key: MappingActionKind.ValueSelector,
      testId: 'transformation-actions-selector',
      getLabel: () => 'Add value selector (value-of)',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyValueOfSelector(n);
        onUpdate();
      },
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return false;
        if (!VisualizationUtilService.isMappingNode(n)) return true;
        return !MappingActionRegistryService.mappingIsOneOf(
          ValueSelector,
          ForEachItem,
          ForEachGroupItem,
          ChooseItem,
          UnknownMappingItem,
        )(n);
      },
      isDisabled: (n) => MappingActionService.hasValueOfSelector(n),
    },
    {
      key: MappingActionKind.CopyOfSelector,
      testId: 'transformation-actions-copy-of',
      getLabel: () => 'Add copy selector (copy-of)',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyCopyOfSelector(n);
        onUpdate();
      },
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return false;
        if (!VisualizationUtilService.isMappingNode(n)) return true;
        return !MappingActionRegistryService.mappingIsOneOf(
          ValueSelector,
          ForEachItem,
          ForEachGroupItem,
          ChooseItem,
          UnknownMappingItem,
        )(n);
      },
    },
    {
      key: MappingActionKind.When,
      testId: 'transformation-actions-when',
      getLabel: () => 'Add "when"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyWhen(n);
        onUpdate();
      },
      isAllowed: MappingActionRegistryService.mappingIsOneOf(ChooseItem),
    },
    {
      key: MappingActionKind.Otherwise,
      testId: 'transformation-actions-otherwise',
      getLabel: () => 'Add "otherwise"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyOtherwise(n);
        onUpdate();
      },
      isAllowed: (n) =>
        VisualizationUtilService.isMappingNode(n) && n.mapping instanceof ChooseItem && !n.mapping.otherwise,
    },
    {
      key: MappingActionKind.ForEach,
      testId: 'transformation-actions-foreach',
      group: MappingActionGroup.WrapWithInstruction,
      getLabel: () => 'Wrap with "for-each"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyForEach(n as ForEachCapableNodeData);
        onUpdate();
      },
      isAllowed: (n) =>
        n instanceof AddMappingNodeData ||
        (VisualizationUtilService.isFieldNode(n) && VisualizationUtilService.isCollectionField(n)),
    },
    {
      key: MappingActionKind.ForEachGroup,
      testId: 'transformation-actions-foreachgroup',
      group: MappingActionGroup.WrapWithInstruction,
      getLabel: () => 'Wrap with "for-each-group"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyForEachGroup(n as ForEachCapableNodeData);
        onUpdate();
      },
      isAllowed: (n) =>
        n instanceof AddMappingNodeData ||
        (VisualizationUtilService.isFieldNode(n) && VisualizationUtilService.isCollectionField(n)),
    },
    {
      key: MappingActionKind.ForEachCurrentGroup,
      testId: 'transformation-actions-foreach-current-group',
      group: MappingActionGroup.WrapWithInstruction,
      getLabel: () => 'Wrap with "for-each current-group()"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyForEachCurrentGroup(n as ForEachCapableNodeData);
        onUpdate();
      },
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return false;
        if (!VisualizationUtilService.isFieldNode(n) || !VisualizationUtilService.isCollectionField(n)) return false;
        return MappingActionRegistryService.allowForEachCurrentGroup(n);
      },
    },
    {
      key: MappingActionKind.If,
      testId: 'transformation-actions-if',
      group: MappingActionGroup.WrapWithInstruction,
      getLabel: () => 'Wrap with "if"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyIf(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !VisualizationUtilService.isMappingNode(n) ||
        !MappingActionRegistryService.mappingIsOneOf(ValueSelector, WhenItem, OtherwiseItem, IfItem, ChooseItem)(n),
    },
    {
      key: MappingActionKind.Choose,
      testId: 'transformation-actions-choose',
      group: MappingActionGroup.WrapWithInstruction,
      getLabel: () => 'Wrap with "choose-when-otherwise"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyChooseWhenOtherwise(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !VisualizationUtilService.isMappingNode(n) ||
        !MappingActionRegistryService.mappingIsOneOf(ValueSelector, WhenItem, OtherwiseItem, IfItem, ChooseItem)(n),
    },
    {
      key: MappingActionKind.InnerForEach,
      testId: 'transformation-actions-foreach-inner',
      group: MappingActionGroup.InnerInstruction,
      getLabel: () => 'Inner "for-each"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyInnerForEach(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !MappingActionRegistryService.isUnselectedWrapperField(n) &&
        (n instanceof AddMappingNodeData ||
          VisualizationUtilService.isFieldNode(n) ||
          MappingActionRegistryService.mappingIsOneOf(ForEachItem, ForEachGroupItem)(n)),
    },
    {
      key: MappingActionKind.InnerForEachGroup,
      testId: 'transformation-actions-foreachgroup-inner',
      group: MappingActionGroup.InnerInstruction,
      getLabel: () => 'Inner "for-each-group"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyInnerForEachGroup(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !MappingActionRegistryService.isUnselectedWrapperField(n) &&
        (n instanceof AddMappingNodeData ||
          VisualizationUtilService.isFieldNode(n) ||
          MappingActionRegistryService.mappingIsOneOf(ForEachItem, ForEachGroupItem)(n)),
    },
    {
      key: MappingActionKind.InnerForEachCurrentGroup,
      testId: 'transformation-actions-foreach-current-group-inner',
      group: MappingActionGroup.InnerInstruction,
      getLabel: () => 'Inner "for-each current-group()"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyInnerForEachCurrentGroup(n);
        onUpdate();
      },
      isAllowed: (n) => {
        if (n instanceof AddMappingNodeData) return false;
        if (MappingActionRegistryService.isUnselectedWrapperField(n)) return false;
        const nodeTypeAllowed =
          VisualizationUtilService.isFieldNode(n) ||
          MappingActionRegistryService.mappingIsOneOf(ForEachItem, ForEachGroupItem)(n);
        if (!nodeTypeAllowed) return false;
        return MappingActionRegistryService.allowForEachCurrentGroup(n);
      },
    },
    {
      key: MappingActionKind.InnerChoose,
      testId: 'transformation-actions-choose-inner',
      group: MappingActionGroup.InnerInstruction,
      getLabel: () => 'Inner "choose-when-otherwise"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyInnerChooseWhenOtherwise(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !MappingActionRegistryService.isUnselectedWrapperField(n) &&
        (VisualizationUtilService.isFieldNode(n) ||
          MappingActionRegistryService.mappingIsOneOf(ForEachItem, ForEachGroupItem)(n)),
    },
    {
      key: MappingActionKind.InnerIf,
      testId: 'transformation-actions-if-inner',
      group: MappingActionGroup.InnerInstruction,
      getLabel: () => 'Inner "if"',
      apply: (n, { onUpdate }) => {
        MappingActionService.applyInnerIf(n);
        onUpdate();
      },
      isAllowed: (n) =>
        !MappingActionRegistryService.isUnselectedWrapperField(n) &&
        (VisualizationUtilService.isFieldNode(n) ||
          MappingActionRegistryService.mappingIsOneOf(ForEachItem, ForEachGroupItem, IfItem)(n)),
    },
    {
      key: MappingActionKind.Variable,
      testId: 'transformation-actions-variable',
      getLabel: () => 'Add variable',
      apply: (n) => {
        useDocumentTreeStore.getState().setAddingVariableTo(n.path.toString());
      },
      isAllowed: (n) => {
        if (n instanceof VariableNodeData) return false;
        if (n instanceof TargetDocumentNodeData) return false;
        if (VisualizationUtilService.isFieldNode(n)) return DocumentService.hasChildren(n.field);
        return (
          VisualizationUtilService.isMappingNode(n) &&
          !MappingActionRegistryService.mappingIsOneOf(ValueSelector, ChooseItem, UnknownMappingItem)(n)
        );
      },
    },
    {
      key: MappingActionKind.RenameVariable,
      testId: 'transformation-actions-rename-variable',
      getLabel: () => 'Rename variable',
      apply: (n) => {
        if (n instanceof VariableNodeData) {
          useDocumentTreeStore.getState().setRenamingVariable(n.mapping.id);
        }
      },
      isAllowed: (n) => n instanceof VariableNodeData,
    },
    {
      key: MappingActionKind.Duplicate,
      testId: 'transformation-actions-duplicate',
      getLabel: (n) => {
        if (VisualizationUtilService.isMappingNode(n) && n.mapping instanceof IfItem) {
          return 'Duplicate "if"';
        }
        return 'Duplicate';
      },
      apply: (n, { onUpdate }) => {
        if (VisualizationUtilService.isMappingNode(n) && n.mapping instanceof IfItem) {
          MappingActionService.duplicateIf(n);
        } else if (VisualizationUtilService.isFieldNode(n)) {
          MappingActionService.duplicateFieldNode(n);
        }
        onUpdate();
      },
      isAllowed: (n) => {
        if (VisualizationUtilService.isMappingNode(n) && n.mapping instanceof IfItem) return true;
        if (VisualizationUtilService.isFieldNode(n)) return VisualizationUtilService.isCollectionField(n);
        return false;
      },
    },
    {
      key: MappingActionKind.AddField,
      testId: 'transformation-actions-add-field',
      getLabel: () => 'Add field',
      apply: (_n, { openModal }) => {
        openModal(MappingActionKind.AddField);
      },
      isAllowed: (n) => {
        if (
          !(
            n.mapping instanceof WhenItem ||
            n.mapping instanceof OtherwiseItem ||
            n.mapping instanceof IfItem ||
            n.mapping instanceof ForEachItem ||
            n.mapping instanceof ForEachGroupItem
          )
        )
          return false;
        let current = n.mapping.parent;
        while (current instanceof MappingItem) {
          if (current instanceof FieldItem) return DocumentService.hasChildren(current.field);
          current = current.parent;
        }
        return false;
      },
      isDisabled: (n) => {
        if (!(n.mapping instanceof MappingItem)) return true;
        let forEachContext = n.mapping instanceof ForEachItem || n.mapping instanceof ForEachGroupItem;
        let current: MappingItem = n.mapping;
        while (current.parent instanceof MappingItem) {
          current = current.parent;
          if (!forEachContext && (current instanceof ForEachItem || current instanceof ForEachGroupItem))
            forEachContext = true;
          if (current instanceof FieldItem) {
            const existingFieldItems = n.mapping.children.filter((c): c is FieldItem => c instanceof FieldItem);
            const result = computeAddFieldCandidates(
              current.field.fields,
              current.mappingTree.namespaceMap,
              existingFieldItems,
              forEachContext,
            );
            return result.candidates.length === 0;
          }
        }
        return true;
      },
    },
  ];

  /**
   * Returns the set of {@link MappingActionKind} values permitted for the given
   * target node. Callers should convert the result to a `Set` for O(1) membership
   * tests when rendering multiple action controls.
   *
   * @param nodeData - The target node whose capabilities are evaluated.
   * @returns An array of allowed action identifiers for this node.
   */
  static getAllowedActions(nodeData: TargetNodeData): MappingActionKind[] {
    return MappingActionRegistryService.ACTION_REGISTRY.filter((def) => def.isAllowed(nodeData)).map((def) => def.key);
  }

  /**
   * Returns the context menu action definitions that are allowed for the given
   * target node. Each returned entry carries its label, testId, and apply callback.
   *
   * @param nodeData - The target node whose menu items are evaluated.
   * @returns An array of allowed context menu action definitions.
   */
  static getMappingContextMenuItems(nodeData: TargetNodeData): IMappingContextMenuAction[] {
    return MappingActionRegistryService.ACTION_REGISTRY.filter(
      (def): def is IMappingContextMenuAction =>
        MappingActionRegistryService.isContextMenuAction(def) && def.isAllowed(nodeData),
    );
  }
}
