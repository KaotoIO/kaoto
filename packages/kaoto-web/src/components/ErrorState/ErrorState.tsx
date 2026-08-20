import './ErrorState.scss';

import { Renew } from '@carbon/icons-react';
import { Button, InlineNotification } from '@carbon/react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  kind?: 'error' | 'warning' | 'info';
}

export const ErrorState = ({ title = 'Error', message, onRetry, kind = 'error' }: ErrorStateProps) => {
  return (
    <div className="cs--error-state">
      <InlineNotification
        kind={kind}
        title={title}
        subtitle={message}
        hideCloseButton
        lowContrast
        className="cs--error-state__notification"
      />
      {onRetry && (
        <Button kind="tertiary" size="sm" renderIcon={Renew} onClick={onRetry} className="cs--error-state__retry">
          Retry
        </Button>
      )}
    </div>
  );
};

// Made with Bob
