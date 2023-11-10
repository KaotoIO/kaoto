import { Button, Tooltip, TooltipProps } from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
import { useState } from 'react';
import { useSourceCodeContext } from '../../../../hooks/useSourceCodeContext/useSourceCodeContext';

export const successTooltipText = 'Content added to clipboard';

export const defaultTooltipText = 'Copy to clipboard';

export function FlowClipboard() {
  const { sourceCode } = useSourceCodeContext();
  const [isCopied, setIsCopied] = useState(false);

  const onClick = () => {
    setIsCopied(true);
    navigator.clipboard.writeText(sourceCode);
  };

  const tooltipProps: TooltipProps = {
    position: 'bottom',
    content: <div>{isCopied ? successTooltipText : defaultTooltipText}</div>,
    onTooltipHidden: () => setIsCopied(false),
  };

  return (
    <Tooltip {...tooltipProps}>
      <Button onClick={onClick} variant="control" data-testid="clipboardButton">
        <CopyIcon />
      </Button>
    </Tooltip>
  );
}
