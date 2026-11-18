import { TextInput } from '@carbon/react';
import {
  FunctionComponent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useFiles } from '../../hooks/useFiles';
import { buildRenamedPath } from '../../services/files/file-path';
import { StoredFile } from '../../services/files/stored-file';

interface RenameFieldProps {
  file: StoredFile;
  /**
   * Called once renaming is over, after the file was renamed or renaming was cancelled.
   *
   * @param byKeyboard whether Enter or Escape ended it, so that focus goes back to the tree item; when the field lost
   * the focus, it stays where the user put it
   */
  onDone: (byKeyboard: boolean) => void;
}

const TAKEN = 'A file with that name already exists';

/**
 * Renames a file in place of its name in the Explorer.
 *
 * Enter and clicking elsewhere rename the file, Escape cancels. Clicking elsewhere with a name that cannot be used
 * cancels as well, while Enter keeps the field open with the error. The part of the name before its first dot is
 * selected, so that typing replaces the name and keeps the extension.
 */
export const RenameField: FunctionComponent<RenameFieldProps> = ({ file, onDone }) => {
  const { files, renameFile } = useFiles();
  const currentName = file.path.slice(file.path.lastIndexOf('/') + 1);
  /** The name the field opened with; the file's name changes once the rename is stored, shortly before it closes */
  const [openedName] = useState(currentName);
  const [name, setName] = useState(openedName);
  const [failure, setFailure] = useState<string>();
  const [renaming, setRenaming] = useState(false);
  /**
   * Set once the field is finished: renamed, cancelled, or replaced by another file's field. Anything that comes in
   * late is ignored then: the blur of a field about to unmount, or a rename that finishes after another file's field
   * took this one's place (which must not close that field).
   */
  const closed = useRef(false);
  useEffect(() => {
    // StrictMode runs the effect, its cleanup and the effect again, so the flag is reset on every run
    closed.current = false;
    return () => {
      closed.current = true;
    };
  }, []);

  /** Focuses the input once it is attached and selects the part of the opened name before its first dot */
  const focusInput = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return;
      input.focus();
      const dot = openedName.indexOf('.');
      input.setSelectionRange(0, dot > 0 ? dot : openedName.length);
    },
    [openedName],
  );

  const result = buildRenamedPath(file.path, name);
  const unchanged = 'path' in result && result.path === file.path;
  const taken = 'path' in result && !unchanged && files.some((candidate) => candidate.path === result.path);
  let error = failure;
  if ('error' in result) error = result.error;
  else if (taken) error = TAKEN;

  const finish = (byKeyboard: boolean) => {
    if (closed.current) return;
    closed.current = true;
    onDone(byKeyboard);
  };

  const rename = async (byKeyboard: boolean) => {
    if (closed.current || renaming) return;
    if (unchanged) {
      finish(byKeyboard);
      return;
    }
    if (!('path' in result) || taken) {
      // Enter keeps the field open with the error; leaving the field gives up
      if (!byKeyboard) finish(false);
      return;
    }

    setRenaming(true);
    try {
      await renameFile(file.id, result.path);
      finish(byKeyboard);
    } catch (renameError) {
      setFailure(renameError instanceof Error ? renameError.message : String(renameError));
      setRenaming(false);
    }
  };

  /** Enter renames, Escape cancels; both are left to an IME composition, which they confirm or cancel */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void rename(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      finish(true);
    }
  };

  return (
    // The tree item around the field would take its clicks and keys: select the file, toggle, or search the tree
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      className="cs--explorer__rename"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
      }}
    >
      <TextInput
        id={`cs--explorer-rename-${file.id}`}
        ref={focusInput}
        size="sm"
        labelText="Rename file"
        hideLabel
        value={name}
        readOnly={renaming}
        invalid={!!error && !unchanged}
        invalidText={error}
        autoComplete="off"
        data-testid="explorer-rename-input"
        onChange={(event) => {
          setName(event.target.value);
          setFailure(undefined);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          void rename(false);
        }}
      />
    </span>
  );
};
