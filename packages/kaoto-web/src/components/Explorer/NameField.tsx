import { TextInput } from '@carbon/react';
import {
  FunctionComponent,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/** The path the name leads to, why it cannot be used, or that it is the name the field started with */
export type NameResult = { path: string } | { error: string } | 'unchanged';

interface NameFieldProps {
  /** The id of the input */
  id: string;
  /** The accessible name of the input, e.g. "Rename file" */
  label: string;
  initialName: string;
  'data-testid'?: string;
  validate: (name: string) => NameResult;
  /** Stores the path; when it rejects, the field shows the error and stays open */
  commit: (path: string) => Promise<void>;
  /**
   * Called once naming is over, after the path was stored or naming was cancelled.
   *
   * @param byKeyboard whether Enter or Escape ended it, so that focus goes back to the tree; when the field lost the
   * focus, it stays where the user put it
   */
  onDone: (byKeyboard: boolean) => void;
}

/**
 * Names a file or folder in place in the Explorer.
 *
 * Enter and clicking elsewhere store the name, Escape cancels. Clicking elsewhere with a name that cannot be used
 * cancels as well, while Enter keeps the field open with the error. The part of the name before its first dot is
 * selected, so that typing replaces the name and keeps the extension. The error shows once the name was changed or
 * Enter was pressed, so that an empty field does not open with an error.
 */
export const NameField: FunctionComponent<NameFieldProps> = ({
  id,
  label,
  initialName,
  'data-testid': dataTestId,
  validate,
  commit,
  onDone,
}) => {
  /** The name the field opened with; a renamed entry's name changes once it is stored, shortly before it closes */
  const [openedName] = useState(initialName);
  const [name, setName] = useState(openedName);
  const [failure, setFailure] = useState<string>();
  const [attempted, setAttempted] = useState(false);
  const [committing, setCommitting] = useState(false);
  /**
   * Set once the field is finished: stored, cancelled, or replaced by another entry's field. Anything that comes in
   * late is ignored then: the blur of a field about to unmount, or a store that finishes after another entry's field
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

  const result = validate(name);
  const unchanged = result === 'unchanged';
  let error = failure;
  if (typeof result === 'object' && 'error' in result) error = result.error;
  const showError = !!error && !unchanged && (name !== openedName || attempted);

  const finish = (byKeyboard: boolean) => {
    if (closed.current) return;
    closed.current = true;
    onDone(byKeyboard);
  };

  const submit = async (byKeyboard: boolean) => {
    if (closed.current || committing) return;
    if (unchanged) {
      finish(byKeyboard);
      return;
    }
    if ('error' in result) {
      // Enter keeps the field open with the error; leaving the field gives up
      if (byKeyboard) setAttempted(true);
      else finish(false);
      return;
    }

    setCommitting(true);
    try {
      await commit(result.path);
      finish(byKeyboard);
    } catch (commitError) {
      setFailure(commitError instanceof Error ? commitError.message : String(commitError));
      setAttempted(true);
      setCommitting(false);
    }
  };

  /** Enter stores, Escape cancels; both are left to an IME composition, which they confirm or cancel */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void submit(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      // A started store cannot be taken back, so the field stays until it is done
      if (!committing) finish(true);
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
        id={id}
        ref={focusInput}
        size="sm"
        labelText={label}
        hideLabel
        value={name}
        readOnly={committing}
        invalid={showError}
        invalidText={error}
        autoComplete="off"
        data-testid={dataTestId}
        onChange={(event) => {
          setName(event.target.value);
          setFailure(undefined);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          void submit(false);
        }}
      />
    </span>
  );
};
