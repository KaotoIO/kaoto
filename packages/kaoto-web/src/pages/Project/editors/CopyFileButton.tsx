import { Copy } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent, useEffect, useState } from 'react';

type CopyState = 'idle' | 'copied' | 'failed';

/** The label of the button, which also tells how the last copy went */
const LABELS: Record<CopyState, string> = {
  idle: 'Copy to clipboard',
  copied: 'Copied to clipboard',
  failed: 'Could not copy to clipboard',
};

/** How long the label tells how the last copy went */
const FEEDBACK_MS = 2000;

interface CopyFileButtonProps {
  /** The content of the open file */
  content: string;
}

/** Copies the content of the open file to the clipboard, and tells in its label for a moment that it did */
export const CopyFileButton: FunctionComponent<CopyFileButtonProps> = ({ content }) => {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => {
      setState('idle');
    }, FEEDBACK_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(
      () => {
        setState('copied');
      },
      () => {
        setState('failed');
      },
    );
  };

  return (
    // The rightmost button of the header bar: its tooltip opens towards the left, inside the window. It stays open on a
    // click, so that it shows how the copy went.
    <IconButton
      label={LABELS[state]}
      onClick={handleCopy}
      kind="ghost"
      size="sm"
      align="bottom-end"
      closeOnActivation={false}
    >
      <Copy />
    </IconButton>
  );
};
