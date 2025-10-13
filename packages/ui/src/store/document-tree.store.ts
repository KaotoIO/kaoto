import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface DocumentTreeState {
  /** Map of document ID -> node path -> expansion state */
  expansionState: { [documentId: string]: { [nodePath: string]: boolean } };

  /** Toggle expansion state of a node */
  toggleExpansion: (documentId: string, nodePath: string) => void;

  /** Set expansion state of a node */
  setTreeExpansion: (documentId: string, treeState: { [nodePath: string]: boolean }) => void;

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

      setTreeExpansion: (documentId: string, treeState: { [nodePath: string]: boolean }) => {
        set((state) => ({ expansionState: { ...state.expansionState, [documentId]: treeState } }));
      },

      isExpanded: (documentId: string, nodePath: string) => {
        return get().expansionState[documentId]?.[nodePath] ?? false;
      },
    }),
    { name: 'Document Tree Store' },
  ),
);
