import { devtools } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { DocumentTree } from '../models/datamapper/document-tree';
import { PathUtil } from '../services/path-util';
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

  /** Currently selected node for mapping */
  selectedNodePath: string | null;
  selectedNodeIsSource: boolean;

  /**
   * Stable node path of the XPath input field that should receive focus.
   * Uses stable paths (via PathUtil.toStableNodePath) to match nodes reliably
   * across re-renders. Automatically cleared after the input receives focus.
   */
  targetXPathInputForFocus: string | null;

  /** Set the document's connection ports map with fresh data */
  setNodesConnectionPorts: (documentId: string, ports: TreeConnectionPorts) => void;

  /** Toggle expansion state of a node */
  toggleExpansion: (documentId: string, nodePath: string) => void;

  /** Update the expansionState from a DocumentTree keeping the matching entries */
  updateTreeExpansion: (documentTree: DocumentTree) => void;

  /** Get expansion state of a node */
  isExpanded: (documentId: string, nodePath: string) => boolean;

  /** Selection state management */
  setSelectedNode: (nodePath: string | null, isSource: boolean) => void;
  toggleSelectedNode: (nodePath: string, isSource: boolean) => void;
  clearSelection: () => void;
  isNodeSelected: (nodePath: string, isSource: boolean) => boolean;

  /**
   * Request focus on the XPath input field for the specified target node.
   * Converts the node path to a stable identifier to ensure reliable matching
   * even if the component re-renders with different random suffixes.
   */
  requestXPathInputFocus: (nodePath: string) => void;

  /**
   * Clear the XPath input focus request after it has been applied.
   * Should be called immediately after the input field receives focus.
   */
  clearXPathInputFocusRequest: () => void;

  /**
   * Check if the XPath input for this node path should receive focus.
   * Compares stable node paths to handle random suffix variations.
   */
  shouldFocusXPathInput: (nodePath: string) => boolean;
}

export const useDocumentTreeStore = createWithEqualityFn<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expansionState: {},
      expansionStateArray: {},
      nodesConnectionPorts: {},
      nodesConnectionPortsArray: {},
      selectedNodePath: null,
      selectedNodeIsSource: false,
      targetXPathInputForFocus: null,

      setNodesConnectionPorts: (documentId: string, ports: TreeConnectionPorts) => {
        set((state) => ({
          nodesConnectionPorts: {
            ...state.nodesConnectionPorts,
            [documentId]: ports,
          },
          nodesConnectionPortsArray: {
            ...state.nodesConnectionPortsArray,
            [documentId]: Object.keys(ports).filter((nodePath) => !nodePath.includes(':EDGE:')),
          },
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

      isNodeSelected: (nodePath, isSource) => {
        return get().selectedNodePath === nodePath && get().selectedNodeIsSource === isSource;
      },

      requestXPathInputFocus: (nodePath: string) => {
        set({ targetXPathInputForFocus: PathUtil.toStableNodePath(nodePath) });
      },

      clearXPathInputFocusRequest: () => {
        set({ targetXPathInputForFocus: null });
      },

      shouldFocusXPathInput: (nodePath: string) => {
        const storedPath = get().targetXPathInputForFocus;
        if (!storedPath) return false;
        return PathUtil.isSameStableNodePath(storedPath, nodePath);
      },
    }),
    { name: 'Document Tree Store' },
  ),
  shallow,
);
