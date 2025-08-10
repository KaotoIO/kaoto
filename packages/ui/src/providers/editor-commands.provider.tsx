import { FunctionComponent, PropsWithChildren, useEffect, useMemo, useRef, useState } from 'react';
import { EditorCommandsContext } from '../multiplying-architecture/Bridge/EditorCommandsContext';
import { EditService } from '../multiplying-architecture/EditService';
import { SourceCodeApiContext, SourceCodeContext } from './source-code.provider';
import { EventNotifier } from '../utils';
import { useContext } from 'react';

export const EditorCommandsProvider: FunctionComponent<PropsWithChildren> = ({ children }) => {
  const eventNotifier = EventNotifier.getInstance();
  const { setCodeAndNotify } = useContext(SourceCodeApiContext);
  const initialSourceCode = useContext(SourceCodeContext);
  const currentRef = useRef<string>(initialSourceCode);

  // Register baseline content on mount
  useEffect(() => {
    (async () => {
      await EditService.getInstance().registerEdit(initialSourceCode);
      currentRef.current = initialSourceCode;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global keyboard shortcuts: Undo/Redo
  useEffect(() => {
    const isTextInputLike = (el: Element | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const isInsideCodeEditor = (el: Element | null): boolean => {
      if (!el || !(el instanceof HTMLElement)) return false;
      return Boolean(el.closest('.pf-v6-c-code-editor, .monaco-editor'));
    };

    const onKeyDown = async (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const primary = isMac ? e.metaKey : e.ctrlKey;
      if (!primary) return;

      // Skip when typing in text inputs or inside the code editor, which handles its own undo/redo
      if (isTextInputLike(e.target as Element) || isInsideCodeEditor(e.target as Element)) {
        return;
      }

      // Undo: Ctrl/Cmd+Z
      if (!e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        await EditService.getInstance().beginUndoRedo();
        try {
          const prev = EditService.getInstance().undo();
          if (prev !== undefined) {
            setCodeAndNotify(prev);
            currentRef.current = prev;
          }
        } finally {
          EditService.getInstance().endUndoRedo();
        }
        setHistoryTick((v) => v + 1);
        return;
      }

      // Redo: Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y
      if ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || e.key.toLowerCase() === 'y') {
        e.preventDefault();
        await EditService.getInstance().beginUndoRedo();
        try {
          const next = EditService.getInstance().redo();
          if (next !== undefined) {
            setCodeAndNotify(next);
            currentRef.current = next;
          }
        } finally {
          EditService.getInstance().endUndoRedo();
        }
        setHistoryTick((v) => v + 1);
      }
    };

    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () =>
      document.removeEventListener('keydown', onKeyDown, { capture: true } as unknown as EventListenerOptions);
  }, [setCodeAndNotify]);

  const [historyTick, setHistoryTick] = useState(0);

  // Register edits on content changes from entities and from code
  useEffect(() => {
    const unsubscribeFromEntities = eventNotifier.subscribe('entities:updated', async (newContent: string) => {
      if (currentRef.current !== newContent) {
        await EditService.getInstance().registerEdit(newContent);
        currentRef.current = newContent;
        setHistoryTick((v) => v + 1);
      }
    });

    const unsubscribeFromCode = eventNotifier.subscribe('code:updated', async ({ code: newContent }) => {
      if (!EditService.getInstance().isPerformingUndoRedo() && currentRef.current !== newContent) {
        await EditService.getInstance().registerEdit(newContent);
        currentRef.current = newContent;
        setHistoryTick((v) => v + 1);
      }
    });

    return () => {
      unsubscribeFromEntities();
      unsubscribeFromCode();
    };
  }, [eventNotifier]);

  const value = useMemo(() => {
    return {
      undo: async () => {
        const prev = EditService.getInstance().undo();
        if (prev === undefined) return;
        try {
          EditService.getInstance().beginUndoRedo();
          setCodeAndNotify(prev);
          currentRef.current = prev;
        } finally {
          EditService.getInstance().endUndoRedo();
        }
        setHistoryTick((v) => v + 1);
      },
      redo: async () => {
        const next = EditService.getInstance().redo();
        if (next === undefined) return;
        try {
          EditService.getInstance().beginUndoRedo();
          setCodeAndNotify(next);
          currentRef.current = next;
        } finally {
          EditService.getInstance().endUndoRedo();
        }
        setHistoryTick((v) => v + 1);
      },
      canUndo: () => EditService.getInstance().canUndo(),
      canRedo: () => EditService.getInstance().canRedo(),
      version: historyTick,
    };
  }, [setCodeAndNotify, historyTick]);

  return <EditorCommandsContext.Provider value={value}>{children}</EditorCommandsContext.Provider>;
};
