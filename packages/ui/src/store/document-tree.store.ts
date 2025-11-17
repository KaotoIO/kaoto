import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { DocumentTree } from '../models/datamapper/document-tree';
import { processTreeNode } from '../utils';

/** [NodePath]: expansion state */
export type TreeExpansionState = Record<string, boolean>;

export interface DocumentTreeState {
  /** Map of [document ID]: expansion state */
  expansionState: Record<string, TreeExpansionState>;

  /** Toggle expansion state of a node */
  toggleExpansion: (documentId: string, nodePath: string) => void;

  /** Set expansion state of a node */
  setTreeExpansion: (documentId: string, treeState: TreeExpansionState) => void;

  /** Update the expansionState from a DocumentTree keeping the matching entries */
  updateTreeExpansion: (documentTree: DocumentTree) => void;

  /** Get expansion state of a node */
  isExpanded: (documentId: string, nodePath: string) => boolean;
}

export const useDocumentTreeStore = create<DocumentTreeState>()(
  devtools(
    (set, get) => ({
      expansionState: {},

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
    }),
    { name: 'Document Tree Store' },
  ),
);
