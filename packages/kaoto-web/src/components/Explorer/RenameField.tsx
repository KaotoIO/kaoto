import { TextInput } from '@carbon/react';
import { FunctionComponent, useEffect, useRef, useState } from 'react';

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
  const [name, setName] = useState(currentName);
  const [failure, setFailure] = useState<string>();
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Set once renaming is over, so that the blur of a field about to unmount does not rename again */
  const done = useRef(false);
  /**
   * Set when the field unmounts. Clicking the rename button of another file moves the focus away first, which renames
   * this file, and that file's field replaces this one before the rename finishes: then it must not close that field.
   */
  const unmounted = useRef(false);
  useEffect(() => {
    // StrictMode runs the effect, its cleanup and the effect again, so the flag is reset on every run
    unmounted.current = false;
    return () => {
      unmounted.current = true;
    };
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    const dot = currentName.indexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : currentName.length);
    // Only when the field opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = buildRenamedPath(file.path, name);
  const unchanged = 'path' in result && result.path === file.path;
  const taken = 'path' in result && !unchanged && files.some((candidate) => candidate.path === result.path);
  let error = failure;
  if ('error' in result) error = result.error;
  else if (taken) error = TAKEN;

  const finish = (byKeyboard: boolean) => {
    done.current = true;
    if (!unmounted.current) onDone(byKeyboard);
  };

  const rename = async (byKeyboard: boolean) => {
    if (done.current || renaming) return;
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
        ref={inputRef}
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
        onKeyDown={(event) => {
          // Enter and Escape confirm or cancel an IME composition, not the rename
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            void rename(true);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            finish(true);
          }
        }}
        onBlur={() => {
          void rename(false);
        }}
      />
    </span>
  );
};
