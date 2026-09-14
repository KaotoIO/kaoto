import { IParentType } from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { FieldItem, MappingItem, MappingTree } from '../../models/datamapper/mapping';
import { NodePath } from '../../models/datamapper/nodepath';
import { DocumentNodeData, TargetDocumentNodeData } from '../../models/datamapper/visualization';
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
 *    pairs. The mapped (new) path is the item's own `nodePath`; the unmapped (old) path is
 *    reconstructed by `computeOldUnmappedPath` (using `field.id`, and the wrapper id for a
 *    substituted non-collection member). The map is applied via `applyPathMigration` using
 *    prefix replacement, so entire subtrees are migrated in one pass regardless of depth.
 *    Source and parameter panels have no MappingTree and are skipped entirely (path map
 *    will be empty).
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
   * was last called for a given document ID.
   *
   * The MappingTree is mutated in place between renders (items are added/removed before
   * `refreshMappingTree` creates a new tree shell). A direct diff of old vs new MappingTree
   * objects would therefore always see the same items on both sides. By snapshotting the
   * FieldItem set at tree-creation time we can compare against the next call's MappingTree
   * and correctly detect which items were added or removed since the previous render.
   */
  private static readonly fieldItemSnapshots: Map<string, Map<FieldItem, string>> = new Map();

  /**
   * Create and register a tree for a document node.
   *
   * When a tree already exists for the same document ID (i.e., a rebuild):
   * 1. For target documents, `buildPathMap` diffs the previous FieldItem snapshot against the
   *    new MappingTree to produce a full-path substitution map for create/remove transitions,
   *    then `applyPathMigration` rewrites the current expansion state in-memory.
   *    Source/parameter panels skip this step.
   * 2. The new tree is stored; `reconcileExpansion` does a verbatim carry-over + prune + frontier
   *    overlay and the result is written via a single `setTreeExpansion` call.
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
    if (documentNodeData instanceof TargetDocumentNodeData && oldSnapshot) {
      const newSnapshot = TreeUIService.collectFieldItems(documentNodeData.mappingTree);
      pathMap = TreeUIService.buildPathMap(oldSnapshot, newSnapshot);
      // Store the new snapshot for the next diff.
      this.fieldItemSnapshots.set(id, newSnapshot);
    } else {
      pathMap = new Map();
      // First build for this ID — take an initial snapshot for the next diff.
      if (documentNodeData instanceof TargetDocumentNodeData) {
        this.fieldItemSnapshots.set(id, TreeUIService.collectFieldItems(documentNodeData.mappingTree));
      }
    }

    const migratedExpansion =
      pathMap.size > 0 ? TreeUIService.applyPathMigration(currentExpansion, pathMap) : currentExpansion;

    this.trees.set(id, tree);

    // Step 2: re-parse expanded-but-unparsed nodes BEFORE reconcileExpansion so the
    // frontier overlay sees them, then do verbatim carry-over + prune + overlay.
    TreeUIService.reparseExpandedNodes(tree, migratedExpansion);
    const newExpansion = TreeUIService.reconcileExpansion(tree, migratedExpansion);
    // Single atomic store write — React never sees a half-migrated intermediate state.
    useDocumentTreeStore.getState().setTreeExpansion(tree.documentNodeDataId, newExpansion);

    return tree;
  }

  static getTree(documentNodeDataId: string): DocumentTree | undefined {
    return this.trees.get(documentNodeDataId);
  }

  /**
   * Toggle node expansion and update store
   */
  static toggleNode(documentId: string, nodePath: string): void {
    const tree = this.trees.get(documentId);
    if (!tree) return;

    const node = tree.findNodeByPath(nodePath);
    if (!node) return;

    const store = useDocumentTreeStore.getState();

    if (!node.isParsed) {
      TreeParsingService.parseTreeNode(node);
    }

    store.toggleExpansion(documentId, nodePath);
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
   * @param documentId - The document ID containing the node
   * @param nodePath - The path of the node to invalidate
   */
  static invalidateNode(documentId: string, nodePath: string): void {
    const tree = this.trees.get(documentId);
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
   * The visual tree path for a `FieldItemNodeData` node is `item.nodePath.toString()` —
   * `NodePath.childOf(parent.nodePath, item.id)` applied recursively, identical to how
   * `MappingNodeData` constructs its `path` field.
   *
   * NOTE: do NOT use `MappingLinksService.computeVisualTargetNodePath` here — that method
   * inserts `field.id` for selected wrapper members and is for edge-rendering port lookup
   * only, not for the document tree node paths stored in the expansion state.
   *
   * This snapshot is stored at tree-creation time so that a subsequent diff can correctly
   * identify which FieldItems were added or removed since the previous render — even if the
   * MappingTree object was mutated in place between renders.
   */
  private static collectFieldItems(tree: MappingTree): Map<FieldItem, string> {
    const result = new Map<FieldItem, string>();
    const visit = (item: MappingItem): void => {
      if (item instanceof FieldItem) {
        result.set(item, item.nodePath.toString());
      }
      for (const child of item.children) {
        visit(child);
      }
    };
    for (const child of tree.children) {
      visit(child);
    }
    return result;
  }

  /**
   * Diff two FieldItem snapshots and return a full-path substitution map:
   * old visual path → new visual path for every {@link FieldItem} that appears in one
   * snapshot but not the other.
   *
   * **Why object identity works:** `refreshMappingTree` re-parents the *same* `FieldItem`
   * instances into the new tree rather than recreating them, so a `FieldItem` present in
   * the old snapshot but absent from the new snapshot (or vice versa) unambiguously
   * identifies a create or remove transition.
   *
   * Visual paths (not mapping-tree paths) are used because expansion state keys are keyed on
   * visual paths: the new (mapped) path is the item's own `nodePath`; the old (unmapped) path
   * is reconstructed by `computeOldUnmappedPath`.
   *
   * **Known gap:** if-wrapping of a selected wrapper member changes the visual path of an
   * already-mapped node in a way that cannot be expressed as a prefix substitution. Expansion
   * keys under if-wrapped nodes will be lost when the wrapping is added. This is accepted as
   * a known limitation for a future improvement.
   */
  private static buildPathMap(oldItems: Map<FieldItem, string>, newItems: Map<FieldItem, string>): Map<string, string> {
    const pathMap = new Map<string, string>();

    // Create transition: FieldItem absent in old, present in new. Before the FieldItem existed the
    // field was a TargetFieldNodeData; computeOldUnmappedPath reconstructs that old path, and the
    // item's snapshot path is the new (mapped) path.
    TreeUIService.collectUnambiguousTransitions(
      newItems,
      oldItems,
      (item, snapshotPath) => [TreeUIService.computeOldUnmappedPath(item), snapshotPath],
      pathMap,
    );

    // Remove transition: FieldItem present in old, absent in new. The item's snapshot path is the
    // old (mapped) path, and computeOldUnmappedPath gives the reverted TargetFieldNodeData path.
    TreeUIService.collectUnambiguousTransitions(
      oldItems,
      newItems,
      (item, snapshotPath) => [snapshotPath, TreeUIService.computeOldUnmappedPath(item)],
      pathMap,
    );

    return pathMap;
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
    resolvePair: (item: FieldItem, snapshotPath: string) => [oldPath: string, newPath: string],
    pathMap: Map<string, string>,
  ): void {
    // The "counterpart" path (the reconstructed side) is what can collide across siblings; count
    // its occurrences first, then only emit pairs whose counterpart is unique.
    const counterpartCounts = new Map<string, number>();
    for (const [item] of source) {
      if (other.has(item)) continue;
      const counterpart = TreeUIService.computeOldUnmappedPath(item);
      counterpartCounts.set(counterpart, (counterpartCounts.get(counterpart) ?? 0) + 1);
    }
    for (const [item, snapshotPath] of source) {
      if (other.has(item)) continue;
      const [oldPath, newPath] = resolvePair(item, snapshotPath);
      const counterpart = TreeUIService.computeOldUnmappedPath(item);
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
   * Reconstruct the visual path a {@link FieldItem}'s field would have if it were still an
   * unmapped `TargetFieldNodeData`. Walks up `item.field.parent` and uses `field.id` at every
   * level — exactly how `TargetFieldNodeData` builds its path from `FieldNodeData`.
   *
   * Two wrapper cases are handled so the reconstructed path matches the expansion key that
   * actually existed before selection / after revert:
   * - A **substituted member** (its parent is a selected wrapper, e.g. `Car` under a selected
   *   `AbstractVehicle`) is rendered at the wrapper's own path segment, not the member's. Before
   *   selection the visible node WAS the (unselected) wrapper, so its key used the wrapper id.
   *   We therefore emit the wrapper's id in place of the member's, and skip the wrapper level.
   * - Other **selected wrapper ancestors** higher up are skipped entirely (transparent nodes).
   *
   * Used for both create (unmapped→mapped) and remove (mapped→unmapped) transitions; both want
   * the same wrapper-based path, since the pre-selection and post-revert visual node is the wrapper.
   */
  private static computeOldUnmappedPath(item: FieldItem): string {
    const segments: string[] = [];
    let current: IParentType = item.field;
    let isLeaf = true;
    while ('parent' in current && current.parent !== current) {
      const parent: IParentType = current.parent;
      if (isLeaf && TreeUIService.isSelectedWrapper(parent) && 'maxOccurs' in parent && parent.maxOccurs === 1) {
        // Substituted member of a NON-collection wrapper (maxOccurs=1): before selection /
        // after revert the visible node is the (unselected) wrapper, so the leaf segment is the
        // wrapper's id, not the member's. Collection wrappers (maxOccurs!==1) render each member
        // at its own per-instance path, so this substitution must not apply there.
        segments.unshift(parent.id);
      } else if (!TreeUIService.isSelectedWrapper(current)) {
        // Skip selected wrapper fields — they are transparent in the visual tree.
        segments.unshift(current.id);
      }
      current = parent;
      isLeaf = false;
    }
    // At the top we have the document root — use item.mappingTree.nodePath for the base.
    let path = item.mappingTree.nodePath;
    for (const seg of segments) {
      path = NodePath.childOf(path, seg);
    }
    return path.toString();
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
      else migratedKeys.delete(newKey);
    }
    return result;
  }
}
