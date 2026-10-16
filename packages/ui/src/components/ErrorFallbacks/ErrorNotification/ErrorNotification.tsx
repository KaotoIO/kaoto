import { InlineNotification } from '@carbon/react';
import { FunctionComponent } from 'react';

import styles from './ErrorNotification.module.scss';

interface ErrorNotificationProps {
  title: string;
  subtitle?: string;
}

export const ErrorNotification: FunctionComponent<ErrorNotificationProps> = ({
  title,
  subtitle = 'Please reload the editor',
}) => {
  return (
    <InlineNotification
      className={styles['error-notification']}
      kind="error"
      lowContrast
      hideCloseButton
      title={title}
      subtitle={subtitle}
      data-testid="error-notification"
    />
  );
};
