import { Copy } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { ComponentProps, FunctionComponent, useEffect, useRef, useState } from 'react';

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
  /** Where the tooltip opens; the rightmost button of the header bar opens it towards the left */
  align?: ComponentProps<typeof IconButton>['align'];
}

/** Copies the content of the open file to the clipboard, and tells in its label for a moment that it did */
export const CopyFileButton: FunctionComponent<CopyFileButtonProps> = ({ content, align = 'bottom-end' }) => {
  const [state, setState] = useState<CopyState>('idle');
  /** Sets the label back once the feedback is shown long enough */
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // No reset after the button is gone
  useEffect(
    () => () => {
      clearTimeout(resetTimerRef.current);
    },
    [],
  );

  /**
   * Shows how the copy went, from the last copy on. The reset is started here rather than in an effect on `state`: an
   * effect only runs after the next render, and a copy that has the same outcome as the one before renders nothing new.
   */
  const showFeedback = (feedback: CopyState) => {
    setState(feedback);
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setState('idle');
    }, FEEDBACK_MS);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(
      () => {
        showFeedback('copied');
      },
      () => {
        showFeedback('failed');
      },
    );
  };

  return (
    // The tooltip stays open on a click, so that it shows how the copy went
    <IconButton
      label={LABELS[state]}
      onClick={handleCopy}
      kind="ghost"
      size="sm"
      align={align}
      closeOnActivation={false}
    >
      <Copy />
    </IconButton>
  );
};
