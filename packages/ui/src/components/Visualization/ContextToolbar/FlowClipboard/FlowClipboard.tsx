import './FlowClipboard.scss';

import { Copy } from '@carbon/icons-react';
import { Button, Icon } from '@patternfly/react-core';
import { useState } from 'react';

import { useSourceCodeStore } from '../../../../store';

export const successTooltipText = 'Content added to clipboard';

export const defaultTooltipText = 'Copy to clipboard';

export const FlowClipboard = () => {
  const [isCopied, setIsCopied] = useState(false);
  const status = isCopied ? 'success' : undefined;
  const tooltipText = isCopied ? successTooltipText : defaultTooltipText;

  const onClick = async () => {
    await navigator.clipboard.writeText(useSourceCodeStore.getState().sourceCode);
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
          <Copy />
        </Icon>
      }
      title={tooltipText}
      onClick={onClick}
      variant="control"
      data-testid="clipboardButton"
      data-copied={isCopied}
    />
  );
};
