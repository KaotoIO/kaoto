import './FlowClipboard.scss';

import { Button, Icon } from '@patternfly/react-core';
import { CopyIcon } from '@patternfly/react-icons';
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
    <Button
      className="flow-clipboard-control"
      icon={
        <Icon status={status}>
          <CopyIcon />
        </Icon>
      }
      title={tooltipText}
      onClick={onClick}
      variant="control"
      data-testid="clipboardButton"
      data-copied={isCopied}
    />
  );
}
