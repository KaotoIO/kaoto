import { IField, IParentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import {
  FieldItem,
  InstructionItem,
  MappingItem,
  MappingParentType,
  MappingTree,
} from '../../models/datamapper/mapping';
import { NodePath } from '../../models/datamapper/nodepath';
import { DocumentNodeData, TargetDocumentNodeData, TargetRenderIndex } from '../../models/datamapper/visualization';
import { TreeExpansionState, useDocumentTreeStore } from '../../store/document-tree.store';
import { processTreeNode } from '../../utils';
import { TreeParsingService } from './tree-parsing.service';

/**
 * Manages tree UI state: creation, expansion toggling, and node invalidation.
 *
 * Owns domain-specific logic for expansion state reconciliation across tree rebuilds.
 * The store ({@link useDocumentTreeStore}) is a pure data layer — it provides a
 * direct setter via `setTreeExpansion`, but has no knowledge of field identity or
 * node type transitions.
 *
 * **How expansion is preserved across mapping create/remove transitions:**
 *
 * When a mapping is created on a target field the node transitions from
 * `TargetFieldNodeData` (path segment = `field.id`) to `FieldItemNodeData`
 * (path segment = `mapping.id`), so every descendant's path string changes and
 * all expansion entries would be orphaned.
 *
 * `createTree` resolves this with two cooperating steps:
 *
 * 1. **Path migration (Step 1):** For target document rebuilds, `buildPathMap` diffs the
 *    previous {@link FieldItem} snapshot against the new {@link MappingTree} and computes a
 *    full-path substitution map: old visual path → new visual path for every `FieldItem` that
 *    exists in one tree but not the other (create: absent in old → present in new; remove:
 *    present in old → absent in new). `FieldItem` objects are stable across rebuilds —
 *    `refreshMappingTree` re-parents the same instances — so identity comparison gives exact
 *    pairs. The mapped (new) path is derived by `collectFieldItems` (the mapping id, or the
 *    member's `field.id` for a substituted non-collection member); the unmapped (old) path comes
 *    from `computeUnmappedPath`: the row path of the nearest field item above it plus the field's
 *    own segment, since instruction rows never show unmapped fields. The map is applied via
 *    `applyPathMigration` using prefix replacement, so entire subtrees are migrated in one pass
 *    regardless of depth.
 *    Source and parameter panels have no MappingTree and are skipped entirely (path map
 *    will be empty).
 *
 *    A `FieldItem` present in both snapshots whose visual path changed has moved: a guard around
 *    it was shown or hidden, or it was wrapped in an instruction. Its old path maps to its new one,
 *    and an ancestor row inserted above it under an expanded parent, such as the `if` a demoted
 *    guard shows as, is seeded expanded unless the store already has an entry for it, so the moved
 *    row stays visible. The snapshot skips the segments of guards the {@link TargetRenderIndex}
 *    absorbs, because those have no row. The selected node path moves with the same map.
 *
 *    **Known gap:** if-wrapping of a selected wrapper member inserts a new segment into an
 *    already-mapped path that cannot be expressed as a simple prefix substitution. This case
 *    is a known limitation and is not handled; expansion keys under if-wrapped nodes will be
 *    dropped when the wrapping is added.
 *
 * 2. **Verbatim carry-over + prune (Step 2):** `reconcileExpansion` seeds `newExpansionState`
 *    from a verbatim copy of the current (already-migrated) store state, preserving deep
 *    entries that are absent from the parse frontier. It then prunes orphaned keys — any key
 *    that is neither equal to, nor a `/`-descendant of, a live content-root path — to prevent
 *    unbounded memory growth across schema swaps. Keys for nodes that disappear underneath a
 *    surviving content root are not pruned. Finally it overlays the frontier walk's computed
 *    values on top, writing into a fresh object so the resulting key order is DFS/visual order.
 *
 * NOTE: `reparseExpandedNodes` runs before `reconcileExpansion` so that the frontier overlay
 * sees nodes that were expanded-but-unparsed.
 */
export class TreeUIService {
  private static readonly trees: Map<string, DocumentTree> = new Map();
  /**
   * Snapshot of `FieldItem` instances present in the MappingTree at the time `createTree`
   * was last called for a given document node ID.
   *
   * The MappingTree is mutated in place between renders (items are added/removed before
   * `refreshMappingTree` creates a new tree shell). A direct diff of old vs new MappingTree
   * objects would therefore always see the same items on both sides. By snapshotting the
   * FieldItem set at tree-creation time we can compare against the next call's MappingTree
   * and correctly detect which items were added, removed or moved since the previous render.
   */
  private static readonly fieldItemSnapshots: Map<string, Map<FieldItem, string>> = new Map();

  /**
   * Create and register a tree for a document node.
   *
   * When a tree already exists for the same document node ID (i.e., a rebuild):
   * 1. For target documents, `buildPathMap` diffs the previous FieldItem snapshot against the
   *    new MappingTree to produce a full-path substitution map for create, remove and move
   *    transitions, then `applyPathMigration` rewrites the current expansion state in-memory and
   *    `seedMovedAncestors` expands the rows a move inserted above a moved row.
   *    Source/parameter panels skip this step.
   * 2. The new tree is stored; `reconcileExpansion` does a verbatim carry-over + prune + frontier
   *    overlay and the result is written via a single `setTreeExpansion` call, which also moves the
   *    selected target row to its new path (`migrateSelection`).
   */
  static createTree(documentNodeData: DocumentNodeData): DocumentTree {
    const id = documentNodeData.id;

    // Step 0: capture the old FieldItem snapshot (may be undefined on first build)
    const oldSnapshot = this.fieldItemSnapshots.get(id);
    // Read expansionState fresh from the store — do NOT cache store.expansionState via an
    // earlier getState() snapshot: Zustand's set() replaces the expansionState object reference,
    // so a snapshot taken before a prior setTreeExpansion call will have a stale reference.
    const currentExpansion = useDocumentTreeStore.getState().expansionState[id] ?? {};

    // Build and parse the new tree
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);

    // Step 1: build a full-path substitution map from the mapping-tree diff and apply it
    // in-memory so reconcileExpansion already sees migrated keys. No store write here —
    // setTreeExpansion below is the single write, so React never sees a half-migrated state.
    //
    // Only target documents carry a MappingTree; source/parameter panels are skipped.
    // oldSnapshot captures the FieldItems as of the PREVIOUS createTree call, before any
    // subsequent mutations to the MappingTree object.
    let pathMap: Map<string, string>;
    let movedPaths: [string, string][] = [];
    if (documentNodeData instanceof TargetDocumentNodeData && oldSnapshot) {
      const newSnapshot = TreeUIService.collectFieldItems(documentNodeData.mappingTree, documentNodeData.renderIndex);
      movedPaths = TreeUIService.collectMovedPaths(oldSnapshot, newSnapshot);
      pathMap = TreeUIService.buildPathMap(oldSnapshot, newSnapshot, movedPaths);
      // Store the new snapshot for the next diff.
      this.fieldItemSnapshots.set(id, newSnapshot);
    } else {
      pathMap = new Map();
      // First build for this ID — take an initial snapshot for the next diff.
      if (documentNodeData instanceof TargetDocumentNodeData) {
        this.fieldItemSnapshots.set(
          id,
          TreeUIService.collectFieldItems(documentNodeData.mappingTree, documentNodeData.renderIndex),
        );
      }
    }

    const migratedExpansion = TreeUIService.seedMovedAncestors(
      pathMap.size > 0 ? TreeUIService.applyPathMigration(currentExpansion, pathMap) : currentExpansion,
      movedPaths,
    );

    this.trees.set(id, tree);

    // Step 2: re-parse expanded-but-unparsed nodes BEFORE reconcileExpansion so the
    // frontier overlay sees them, then do verbatim carry-over + prune + overlay.
    TreeUIService.reparseExpandedNodes(tree, migratedExpansion);
    const newExpansion = TreeUIService.reconcileExpansion(tree, migratedExpansion);
    const selectedNodePath = TreeUIService.migrateSelection(documentNodeData, pathMap, movedPaths);
    // Single atomic store write — React never sees a half-migrated intermediate state.
    useDocumentTreeStore.getState().setTreeExpansion(tree.documentNodeId, newExpansion, selectedNodePath);

    return tree;
  }

  static getTree(documentNodeId: string): DocumentTree | undefined {
    return this.trees.get(documentNodeId);
  }

  /**
   * Forgets every tree created so far.
   */
  static clear(): void {
    this.trees.clear();
  }

  /**
   * Toggle node expansion and update store
   */
  static toggleNode(documentNodeId: string, nodePath: string): void {
    const tree = this.trees.get(documentNodeId);
    if (!tree) return;

    const node = tree.findNodeByPath(nodePath);
    if (!node) return;

    const store = useDocumentTreeStore.getState();

    if (!node.isParsed) {
      TreeParsingService.parseTreeNode(node);
    }

    store.toggleExpansion(documentNodeId, nodePath);
  }

  /**
   * Re-parse any tree nodes that are marked as expanded in the store but were not reached
   * by the initial parseTree frontier walk (their children array is empty).
   * This ensures flatten() can actually show their children after a rebuild, and that
   * the frontier overlay in `reconcileExpansion` sees these nodes as parsed.
   * Only processes nodes that are both expanded (store=true) and unparsed (isParsed=false).
   *
   * NOTE: call this BEFORE `reconcileExpansion` so the frontier overlay correctly reflects
   * the parsed state. For unmapped below-frontier nodes this is the only pass that
   * materialises subtrees — do not remove without adding a replacement.
   */
  private static reparseExpandedNodes(tree: DocumentTree, expansionState: TreeExpansionState): void {
    const reparse = (node: DocumentTreeNode): void => {
      if (!node.isParsed && expansionState[node.path] === true) {
        TreeParsingService.parseTreeNode(node);
      }
      for (const child of node.children) {
        reparse(child);
      }
    };
    for (const contentRoot of tree.contentRoots) {
      reparse(contentRoot);
    }
  }

  /**
   * Invalidate a tree node and all its descendants.
   * Used when a type override or choice selection changes the field structure.
   * The node will be re-parsed on next expansion.
   *
   * @param documentNodeId - The document node ID containing the node
   * @param nodePath - The path of the node to invalidate
   */
  static invalidateNode(documentNodeId: string, nodePath: string): void {
    const tree = this.trees.get(documentNodeId);
    if (!tree) return;

    const node = tree.findNodeByPath(nodePath);
    if (!node) return;

    node.invalidateDescendants();
  }

  /**
   * Verbatim carry-over + prune + frontier overlay reconciliation.
   *
   * Builds the result into a **fresh object** walked in DFS order so that
   * `Object.keys()` — and therefore `expansionStateArray` — is in visual order.
   * Survivors that were not emitted by the DFS walk are appended afterwards.
   *
   * @param newTree - The freshly built tree.
   * @param migratedExpansion - The already segment-migrated expansion snapshot. Entries that
   *   are absent from the parse frontier are preserved verbatim; orphaned keys (outside every
   *   live content-root prefix) are pruned; finally the frontier walk overlays computed values.
   */
  private static reconcileExpansion(newTree: DocumentTree, migratedExpansion: TreeExpansionState): TreeExpansionState {
    // Step 2a: collect survivors — keys that belong to a live content-root prefix.
    // These are kept verbatim (including below-frontier keys) and pruned otherwise.
    const liveRootPaths = newTree.contentRoots.map((r) => r.path);
    const carried: TreeExpansionState = {};
    for (const [key, value] of Object.entries(migratedExpansion)) {
      if (liveRootPaths.some((rootPath) => key === rootPath || key.startsWith(rootPath + '/'))) {
        carried[key] = value;
      }
    }

    // Step 2b: build the result in DFS order (frontier walk), then append any survivors
    // the walk did not emit. Writing into a fresh object preserves DFS/visual key order,
    // which is what expansionStateArray must reflect for getNearestVisiblePort edge selection.
    const newExpansionState: TreeExpansionState = {};

    for (const contentRoot of newTree.contentRoots) {
      processTreeNode(contentRoot, (treeNode) => {
        const isNodeParsed = treeNode.isParsed;
        // If not parsed and already carried over verbatim, skip — do not clobber the
        // stored value with `false`; the carry-over already holds the correct entry.
        if (!isNodeParsed && treeNode.path in carried) {
          newExpansionState[treeNode.path] = carried[treeNode.path];
          return;
        }
        const savedState = carried[treeNode.path];
        newExpansionState[treeNode.path] = isNodeParsed && (savedState ?? true);
      });
    }

    // Append survivors that the frontier walk didn't emit (below-frontier nodes).
    for (const [key, value] of Object.entries(carried)) {
      if (!(key in newExpansionState)) {
        newExpansionState[key] = value;
      }
    }

    return newExpansionState;
  }

  /**
   * Collect all {@link FieldItem} instances reachable from `tree.children`, mapped to their
   * visual document tree path strings.
   *
   * The visual tree path for a `FieldItemNodeData` node is `NodePath.childOf(parentPath, item.id)`
   * applied recursively, identical to how `MappingNodeData` constructs its `path` field — with one
   * exception. A substituted member of a non-collection wrapper is rendered by
   * `doGenerateNodeDataFromWrapperField` from the member field itself, so its node is a
   * `TargetAbstractFieldNodeData`/`TargetChoiceFieldNodeData` whose segment is `field.id`, not the
   * mapping id. See {@link isNonCollectionSelectedWrapper}. The path is therefore built down the
   * walk rather than read from `item.nodePath`, so that the substituted segment also propagates to
   * every descendant.
   *
   * Guards the {@link TargetRenderIndex} absorbs have no row and add no segment.
   *
   * NOTE: do NOT use `TargetRenderService.computeTargetPath` here — it applies the
   * `field.id` substitution to every selected wrapper member, including collection wrappers, which
   * do render at the mapping id. It is for edge-rendering port lookup, where that distinction does
   * not surface.
   *
   * This snapshot is stored at tree-creation time so that a subsequent diff can correctly
   * identify which FieldItems were added or removed since the previous render — even if the
   * MappingTree object was mutated in place between renders.
   */
  private static collectFieldItems(tree: MappingTree, renderIndex: TargetRenderIndex): Map<FieldItem, string> {
    const result = new Map<FieldItem, string>();
    const visit = (item: MappingItem, parentPath: NodePath): void => {
      if (renderIndex.isAbsorbed(item)) {
        for (const child of item.children) {
          visit(child, parentPath);
        }
        return;
      }
      const segment =
        item instanceof FieldItem && TreeUIService.isNonCollectionSelectedWrapper(item.field.parent)
          ? item.field.id
          : item.id;
      const path = NodePath.childOf(parentPath, segment);
      if (item instanceof FieldItem) {
        result.set(item, path.toString());
      }
      for (const child of item.children) {
        visit(child, path);
      }
    };
    for (const child of tree.children) {
      visit(child, tree.nodePath);
    }
    return result;
  }

  /**
   * Diff two FieldItem snapshots and return a full-path substitution map: old visual path → new
   * visual path for every {@link FieldItem} that was created or removed (it appears in one snapshot
   * but not the other) or moved (it appears in both at a different visual path, see
   * `collectMovedPaths`).
   *
   * **Why object identity works:** `refreshMappingTree` re-parents the *same* `FieldItem`
   * instances into the new tree rather than recreating them, so a `FieldItem` present in
   * the old snapshot but absent from the new snapshot (or vice versa) unambiguously
   * identifies a create or remove transition, and one present in both gives the exact pair of a
   * move, with nothing to reconstruct. A moved item whose new path the pair of a moved ancestor
   * already produces is left out, so moving a container doesn't add a pair for every descendant.
   *
   * Visual paths (not mapping-tree paths) are used because expansion state keys are keyed on
   * visual paths: the new (mapped) path comes from the `collectFieldItems` snapshot; the old
   * (unmapped) path comes from `computeUnmappedPath`.
   *
   * **Known gap:** if-wrapping of a selected wrapper member changes the visual path of an
   * already-mapped node in a way that cannot be expressed as a prefix substitution. Expansion
   * keys under if-wrapped nodes will be lost when the wrapping is added. This is accepted as
   * a known limitation for a future improvement.
   */
  private static buildPathMap(
    oldItems: Map<FieldItem, string>,
    newItems: Map<FieldItem, string>,
    movedPaths: [string, string][],
  ): Map<string, string> {
    const pathMap = new Map<string, string>();

    // Create transition: FieldItem absent in old, present in new. Before the FieldItem existed the
    // field was a TargetFieldNodeData; computeUnmappedPath gives that old path, and the item's
    // snapshot path is the new (mapped) path.
    TreeUIService.collectUnambiguousTransitions(
      newItems,
      oldItems,
      (snapshotPath, counterpart) => [counterpart, snapshotPath],
      pathMap,
    );

    // Remove transition: FieldItem present in old, absent in new. The item's snapshot path is the
    // old (mapped) path, and computeUnmappedPath gives the reverted TargetFieldNodeData path.
    TreeUIService.collectUnambiguousTransitions(
      oldItems,
      newItems,
      (snapshotPath, counterpart) => [snapshotPath, counterpart],
      pathMap,
    );

    for (const [oldPath, newPath] of movedPaths) {
      if (pathMap.has(oldPath) || TreeUIService.isMovedWithAncestor(oldPath, newPath, pathMap)) continue;
      pathMap.set(oldPath, newPath);
    }

    return pathMap;
  }

  /**
   * The `[oldPath, newPath]` pairs of every {@link FieldItem} present in both snapshots whose visual
   * path changed, e.g. because a guard around it was shown or hidden or it was wrapped.
   */
  private static collectMovedPaths(
    oldItems: Map<FieldItem, string>,
    newItems: Map<FieldItem, string>,
  ): [string, string][] {
    const moved: [string, string][] = [];
    for (const [item, newPath] of newItems) {
      const oldPath = oldItems.get(item);
      if (oldPath !== undefined && oldPath !== newPath) moved.push([oldPath, newPath]);
    }
    return moved;
  }

  /**
   * Seeds the ancestor rows a move inserted above a moved row as expanded, so the moved row stays
   * visible — e.g. the `if` row a demoted guard now shows as, which would otherwise start collapsed
   * below the parse frontier. Only rows that gained ancestors under their unchanged, expanded parent
   * are considered. A row moved along with a moved ancestor never qualifies, since its old parent's
   * path changed too. The parent's row is parsed, so the inserted rows exist, while under a collapsed
   * parent an inserted row seeded expanded would show an open chevron without children once the user
   * expands the parent. An existing entry is never overwritten, so a container the user collapsed
   * stays collapsed.
   */
  private static seedMovedAncestors(expansion: TreeExpansionState, movedPaths: [string, string][]): TreeExpansionState {
    const seeded: TreeExpansionState = { ...expansion };
    for (const [oldPath, newPath] of movedPaths) {
      const oldParent = TreeUIService.getParentPath(oldPath);
      const gainedAncestors =
        newPath.startsWith(`${oldParent}/`) && TreeUIService.getDepth(newPath) > TreeUIService.getDepth(oldPath);
      if (!gainedAncestors || expansion[oldParent] !== true) continue;
      let ancestor = TreeUIService.getParentPath(newPath);
      while (ancestor.length > oldParent.length) {
        if (!(ancestor in seeded)) seeded[ancestor] = true;
        ancestor = TreeUIService.getParentPath(ancestor);
      }
    }
    return seeded;
  }

  /**
   * The selected target node's path after the rebuild, or `undefined` when it doesn't change. A
   * selected `if` that got absorbed into its field hands the selection to the field's row.
   */
  private static migrateSelection(
    documentNodeData: DocumentNodeData,
    pathMap: Map<string, string>,
    movedPaths: [string, string][],
  ): string | undefined {
    if (!(documentNodeData instanceof TargetDocumentNodeData)) return undefined;
    const { selectedNodePath, selectedNodeIsSource } = useDocumentTreeStore.getState();
    if (!selectedNodePath || selectedNodeIsSource) return undefined;
    const [migratedPath] = Object.keys(TreeUIService.applyPathMigration({ [selectedNodePath]: true }, pathMap));
    if (migratedPath !== selectedNodePath) return migratedPath;
    for (const [oldPath, newPath] of movedPaths) {
      const isAbsorbedParent =
        TreeUIService.getParentPath(oldPath) === selectedNodePath &&
        TreeUIService.getDepth(newPath) < TreeUIService.getDepth(oldPath);
      if (isAbsorbedParent) return newPath;
    }
    return undefined;
  }

  private static getParentPath(path: string): string {
    return path.slice(0, path.lastIndexOf('/'));
  }

  private static isMovedWithAncestor(oldPath: string, newPath: string, pathMap: Map<string, string>): boolean {
    let ancestor = oldPath;
    while (ancestor.includes('/')) {
      ancestor = TreeUIService.getParentPath(ancestor);
      const migratedAncestor = pathMap.get(ancestor);
      if (migratedAncestor !== undefined) return newPath === `${migratedAncestor}${oldPath.slice(ancestor.length)}`;
    }
    return false;
  }

  private static getDepth(path: string): number {
    return path.split('/').length;
  }

  /**
   * For every FieldItem in `source` that is absent from `other`, derive its (oldPath, newPath)
   * pair via `resolvePair` and record it in `pathMap` — but only when the reconstructed
   * counterpart path is claimed by exactly one item (the multi-sibling guard: a collection
   * mapped/removed multiple times yields an ambiguous path that must be skipped).
   */
  private static collectUnambiguousTransitions(
    source: Map<FieldItem, string>,
    other: Map<FieldItem, string>,
    resolvePair: (snapshotPath: string, counterpart: string) => [oldPath: string, newPath: string],
    pathMap: Map<string, string>,
  ): void {
    // The "counterpart" path (the reconstructed side) is what can collide across siblings; count
    // its occurrences first, then only emit pairs whose counterpart is unique.
    const counterparts = new Map<FieldItem, string>();
    const counterpartCounts = new Map<string, number>();
    for (const [item] of source) {
      if (other.has(item)) continue;
      const counterpart = TreeUIService.computeUnmappedPath(item, other);
      if (counterpart === undefined) continue;
      counterparts.set(item, counterpart);
      counterpartCounts.set(counterpart, (counterpartCounts.get(counterpart) ?? 0) + 1);
    }
    for (const [item, snapshotPath] of source) {
      const counterpart = counterparts.get(item);
      if (counterpart === undefined) continue;
      const [oldPath, newPath] = resolvePair(snapshotPath, counterpart);
      if (oldPath !== newPath && counterpartCounts.get(counterpart) === 1) {
        pathMap.set(oldPath, newPath);
      }
    }
  }

  /**
   * Returns true when `node` is a wrapper field with a member already selected —
   * i.e. it is transparent in the visual document tree.
   */
  private static isSelectedWrapper(node: IParentType): boolean {
    if (!('wrapperKind' in node) || !node.wrapperKind) return false;
    if (node.wrapperKind === 'abstract') return node.selectedMemberQName !== undefined;
    return node.selectedMemberIndex !== undefined;
  }

  /**
   * Returns true when `node` is a selected wrapper that collapses onto a single member —
   * i.e. `maxOccurs === 1`, so the member is rendered in the wrapper's own slot rather than at
   * one path per instance.
   *
   * This is the condition under which the visual path of the member and of the wrapper diverge
   * from the mapping tree, and it must be applied symmetrically: `collectFieldItems` substitutes
   * the member's `field.id` for the mapping id on the new side, and `computeUnmappedPath`
   * substitutes the wrapper's id on the old side. Collection wrappers (`maxOccurs !== 1`) render
   * each member at its own per-instance path, so neither substitution applies there.
   */
  private static isNonCollectionSelectedWrapper(node: IParentType): node is IField {
    return TreeUIService.isSelectedWrapper(node) && 'maxOccurs' in node && node.maxOccurs === 1;
  }

  /**
   * The path of the row `item`'s field has while it has no mapping, in the tree of `otherItems`, the
   * snapshot without `item`, or `undefined` when there is none. That row sits under the row of the
   * nearest field item above `item`, passing through instructions such as an `if` or a `for-each`,
   * whose rows never show unmapped fields, so its path is that row's path plus the field's own
   * segment; rebuilding it from the schema would miss the mapping ids in the segments of mapped
   * ancestors. When that field item was created or removed together with `item`, its own unmapped
   * path is used, and a field directly under the document root sits under the document's row.
   * Inside anything else, such as a content-form variable, the field's unmapped row exists
   * independently of `item`, so there is no counterpart.
   *
   * The segment is the field's id, except for the member of a selected wrapper that collapses onto
   * one member: before the member was mapped, or after it is removed, the row is the wrapper's.
   * @param item - the field item that was created or removed
   * @param otherItems - the snapshot in which `item` doesn't exist, mapped to visual paths
   */
  private static computeUnmappedPath(item: FieldItem, otherItems: Map<FieldItem, string>): string | undefined {
    let parent: MappingParentType = item.parent;
    while (parent instanceof InstructionItem) {
      parent = parent.parent;
    }
    const fieldParent = item.field.parent;
    const segment = TreeUIService.isNonCollectionSelectedWrapper(fieldParent) ? fieldParent.id : item.field.id;
    if (parent instanceof MappingTree) return NodePath.childOf(parent.nodePath, segment).toString();
    if (!(parent instanceof FieldItem)) return undefined;
    const anchorPath = otherItems.get(parent) ?? TreeUIService.computeUnmappedPath(parent, otherItems);
    return anchorPath === undefined ? undefined : `${anchorPath}/${segment}`;
  }

  /**
   * Apply a full-path substitution map to an expansion state in-memory: for each key,
   * if the key equals an old path or starts with `oldPath + '/'`, the matching prefix is
   * replaced with the new path. Prefix-based replacement handles entire subtrees in one pass.
   *
   * Operates on a plain object without touching the Zustand store, so `createTree` can
   * collapse the path migration and the final `setTreeExpansion` into a single store
   * write — preventing React from seeing an intermediate half-migrated state.
   */
  private static applyPathMigration(expansion: TreeExpansionState, pathMap: Map<string, string>): TreeExpansionState {
    // Sort entries longest-first so the most-specific (deepest) prefix is matched first.
    // For a newly-mapped chain ShipOrder → ShipTo → Name, the pathMap has entries at every
    // ancestor level. The key for Name's full old path must match the Name entry (longest),
    // not the ShipOrder entry (shortest) — otherwise only the outermost prefix is swapped
    // and a second pass would be needed.
    const sortedEntries = [...pathMap.entries()].sort((a, b) => b[0].length - a[0].length);

    // Track which result keys were produced by an actual migration (newKey !== key) so that a
    // collision between a migrated key and a pass-through (or stale) key resolves deterministically:
    // the migrated value wins. This happens on revert when the store still holds BOTH the wrapper-
    // segment key and the mapped-prefix key for the same logical node — they collapse to one path.
    const result: TreeExpansionState = {};
    const migratedKeys = new Set<string>();
    for (const [key, value] of Object.entries(expansion)) {
      let newKey = key;
      for (const [oldPath, newPath] of sortedEntries) {
        if (key === oldPath) {
          newKey = newPath;
          break;
        }
        if (key.startsWith(oldPath + '/')) {
          newKey = newPath + key.slice(oldPath.length);
          break;
        }
      }
      const isMigrated = newKey !== key;
      // Skip only when a MIGRATED value already occupies the slot — never let a pass-through
      // clobber a migrated value, but allow a migrated value to overwrite a pass-through.
      if (newKey in result && migratedKeys.has(newKey) && !isMigrated) {
        continue;
      }
      result[newKey] = value;
      if (isMigrated) migratedKeys.add(newKey);
    }
    return result;
  }
}
