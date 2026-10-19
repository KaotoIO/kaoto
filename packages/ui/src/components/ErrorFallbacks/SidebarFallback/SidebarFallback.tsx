import { Close } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent } from 'react';

import { ErrorDetails } from '../ErrorDetails';
import { ErrorNotification } from '../ErrorNotification';
import styles from './SidebarFallback.module.scss';

interface SidebarFallbackProps {
  onClose: () => void;
  message: string;
}

export const SidebarFallback: FunctionComponent<SidebarFallbackProps> = ({ onClose, message }) => {
  return (
    <div className={styles['sidebar-fallback']}>
      <div className={styles['sidebar-fallback__close-row']}>
        <IconButton data-testid="close-side-bar" kind="ghost" label="Close" onClick={onClose}>
          <Close />
        </IconButton>
      </div>
      <ErrorNotification title="Something did not work as expected" />
      <ErrorDetails message={message} />
    </div>
  );
};
