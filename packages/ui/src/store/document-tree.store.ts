import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { DocumentTree } from '../models/datamapper/document-tree';
import { processTreeNode } from '../utils';

/** [NodePath]: expansion state */
export type TreeExpansionState = Record<string, boolean>;
export type TreeConnectionPorts = Record<string, [number, number]>;

export interface DocumentTreeState {
  /** Map of [document ID]: {[nodePath]: expansion state} */
  expansionState: Record<string, TreeExpansionState>;
  /** Array of [document ID]: [nodePath] */
  expansionStateArray: Record<string, string[]>;

  /** Map of [document ID]: {[nodePath]: connector circle position} */
  nodesConnectionPorts: Record<string, TreeConnectionPorts>;
  /** Array of [document ID]: [nodePath] */
  nodesConnectionPortsArray: Record<string, string[]>;

  /** Version counter to trigger connection port recalculation */
  connectionPortVersion: number;

  /** Currently selected node for mapping */
  selectedNodePath: string | null;
  selectedNodeIsSource: boolean;

  /** Set the document's connection ports map with fresh data */
  setNodesConnectionPorts: (documentId: string, ports: TreeConnectionPorts) => void;

  /** Toggle expansion state of a node */
  toggleExpansion: (documentId: string, nodePath: string) => void;

  /** Update the expansionState from a DocumentTree keeping the matching entries */
  updateTreeExpansion: (documentTree: DocumentTree) => void;

  /** Get expansion state of a node */
  isExpanded: (documentId: string, nodePath: string) => boolean;

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

      setNodesConnectionPorts: (documentId: string, ports: TreeConnectionPorts) => {
        set((state) => ({
          nodesConnectionPorts: {
            ...state.nodesConnectionPorts,
            [documentId]: ports,
          },
          nodesConnectionPortsArray: {
            ...state.nodesConnectionPortsArray,
            [documentId]: Object.keys(ports),
          },
          connectionPortVersion: state.connectionPortVersion + 1,
        }));
      },

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
          expansionStateArray: {
            ...state.expansionStateArray,
            [documentTree.documentId]: Object.keys(newExpansionState),
          },
        }));
      },

      isExpanded: (documentId: string, nodePath: string) => {
        return get().expansionState[documentId]?.[nodePath] ?? false;
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
