import { useState } from 'react';
import { CopyIcon } from '@patternfly/react-icons';
import { Button, Tooltip, TooltipProps } from '@patternfly/react-core';
import { useEntityContext } from '../../../../hooks/useEntityContext/useEntityContext';

export const successTooltipText = 'Content added to clipboard';

export const defaultTooltipText = 'Copy to clipboard';

export function FlowClipboard() {
  const { code } = useEntityContext();
  const [isCopied, setIsCopied] = useState(false);

  const onClick = () => {
    setIsCopied(true);
    navigator.clipboard.writeText(code);
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
