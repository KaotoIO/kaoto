import hotkeys from 'hotkeys-js';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { useUndoRedo } from '../hooks/undo-redo.hook';

export const KeyboardShortcutsProvider: FunctionComponent<PropsWithChildren> = (props) => {
  const { undo, redo } = useUndoRedo();

  useEffect(() => {
    hotkeys('ctrl+z,command+z', (event) => {
      event.preventDefault();
      undo();
    });

    hotkeys('ctrl+shift+z,command+shift+z', (event) => {
      event.preventDefault();
      redo();
    });

    return () => {
      hotkeys.unbind('ctrl+z,command+z');
      hotkeys.unbind('ctrl+shift+z,command+shift+z');
    };
  }, [redo, undo]);

  return <>{props.children}</>;
};
