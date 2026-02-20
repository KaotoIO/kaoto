import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { DocumentTree } from '../models/datamapper/document-tree';
import { processTreeNode } from '../utils';

/** [NodePath]: expansion state */
export type TreeExpansionState = Record<string, boolean>;

export interface DocumentTreeState {
  /** Map of [document ID]: expansion state */
  expansionState: Record<string, TreeExpansionState>;

  /** Map of [nodePath]: connector circle position */
  nodesConnectionPorts: Record<string, [number, number]>;

  /** Version counter to trigger connection port recalculation */
  connectionPortVersion: number;

  /** Currently selected node for mapping */
  selectedNodePath: string | null;
  selectedNodeIsSource: boolean;

  /** Toggle expansion state of a node */
  toggleExpansion: (documentId: string, nodePath: string) => void;

  /** Set expansion state of a node */
  setTreeExpansion: (documentId: string, treeState: TreeExpansionState) => void;

  /** Update the expansionState from a DocumentTree keeping the matching entries */
  updateTreeExpansion: (documentTree: DocumentTree) => void;

  /** Get expansion state of a node */
  isExpanded: (documentId: string, nodePath: string) => boolean;

  /** Set a node connection port */
  setConnectionPort: (nodePath: string, portPosition: [number, number]) => void;

  /** Removes a connection port */
  unsetConnectionPort: (nodePath: string) => void;

  /** Batch update multiple connection ports at once (more efficient than individual updates) */
  setBatchConnectionPorts: (ports: Record<string, [number, number]>) => void;

  /** Trigger recalculation of all connection ports (e.g., on scroll) */
  refreshConnectionPorts: () => void;

  /** Selection state management */
  setSelectedNode: (nodePath: string | null, isSource: boolean) => void;
  toggleSelectedNode: (nodePath: string, isSource: boolean) => void;
  clearSelection: () => void;
  isNodeSelected: (nodePath: string) => boolean;
}

export const useDocumentTreeStore = createWithEqualityFn<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expansionState: {},
      nodesConnectionPorts: {},
      connectionPortVersion: 0,
      selectedNodePath: null,
      selectedNodeIsSource: false,

      toggleExpansion: (documentId: string, nodePath: string) => {
        const isExpanded = get().isExpanded(documentId, nodePath);
        set((state) => ({
          expansionState: {
            ...state.expansionState,
            [documentId]: {
              ...state.expansionState[documentId],
              [nodePath]: !isExpanded,
            },
          },
        }));
      },

      setTreeExpansion: (documentId: string, treeState: TreeExpansionState) => {
        set((state) => ({ expansionState: { ...state.expansionState, [documentId]: treeState } }));
      },

      updateTreeExpansion: (documentTree: DocumentTree) => {
        const currentExpansionState: TreeExpansionState = get().expansionState[documentTree.documentId] ?? {};
        const newExpansionState: TreeExpansionState = {};

        processTreeNode(documentTree.root, (treeNode) => {
          const isNodeParsed = treeNode.isParsed;
          newExpansionState[treeNode.path] = isNodeParsed && (currentExpansionState[treeNode.path] ?? true);
        });

        set((state) => ({
          expansionState: {
            ...state.expansionState,
            [documentTree.documentId]: newExpansionState,
          },
        }));
      },

      isExpanded: (documentId: string, nodePath: string) => {
        return get().expansionState[documentId]?.[nodePath] ?? false;
      },

      setConnectionPort: (nodePath, portPosition) => {
        set((state) => ({
          nodesConnectionPorts: { ...state.nodesConnectionPorts, [nodePath]: portPosition },
        }));
      },

      unsetConnectionPort: (nodePath) => {
        const { [nodePath]: _discarded, ...rest } = get().nodesConnectionPorts;

        set(() => ({
          nodesConnectionPorts: rest,
        }));
      },

      setBatchConnectionPorts: (ports) => {
        set((state) => ({
          nodesConnectionPorts: { ...state.nodesConnectionPorts, ...ports },
          connectionPortVersion: state.connectionPortVersion + 1,
        }));
      },

      refreshConnectionPorts: () => {
        set((state) => ({
          connectionPortVersion: state.connectionPortVersion + 1,
        }));
      },

      setSelectedNode: (nodePath, isSource) => {
        set({ selectedNodePath: nodePath, selectedNodeIsSource: isSource });
      },

      toggleSelectedNode: (nodePath, isSource) => {
        const current = get().selectedNodePath;
        set({
          selectedNodePath: current === nodePath ? null : nodePath,
          selectedNodeIsSource: current === nodePath ? false : isSource,
        });
      },

      clearSelection: () => {
        set({ selectedNodePath: null, selectedNodeIsSource: false });
      },

      isNodeSelected: (nodePath) => {
        return get().selectedNodePath === nodePath;
      },
    }),
    { name: 'Document Tree Store' },
  ),
  shallow,
);
