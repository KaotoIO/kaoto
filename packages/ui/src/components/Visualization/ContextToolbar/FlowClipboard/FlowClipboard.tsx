import './FlowClipboard.scss';

import { Copy } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { useContext, useState } from 'react';

import { SourceCodeContext } from '../../../../providers';

export const successTooltipText = 'Content added to clipboard';

export const defaultTooltipText = 'Copy to clipboard';

export function FlowClipboard() {
  const sourceCode = useContext(SourceCodeContext);
  const [isCopied, setIsCopied] = useState(false);
  const status = isCopied ? 'success' : undefined;
  const tooltipText = isCopied ? successTooltipText : defaultTooltipText;

  const onClick = () => {
    navigator.clipboard.writeText(sourceCode);
    setIsCopied(true);

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return (
    <IconButton
      className="flow-clipboard-control"
      label={tooltipText}
      onClick={onClick}
      kind="ghost"
      data-testid="clipboardButton"
      data-copied={isCopied}
    >
      <Copy />
    </IconButton>
  );
}
