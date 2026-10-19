import { Close } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent } from 'react';

import { ErrorDetails } from '../ErrorDetails';
import { ErrorNotification } from '../ErrorNotification';
import styles from './NodeFormFallback.module.scss';

interface NodeFormFallbackProps {
  title: string;
  iconUrl: string;
  onClose: () => void;
  message: string;
}

export const NodeFormFallback: FunctionComponent<NodeFormFallbackProps> = ({ title, iconUrl, onClose, message }) => {
  return (
    <div className={styles['node-form-fallback']}>
      <div className={styles['node-form-fallback-header']}>
        {iconUrl && <img src={iconUrl} className={styles['node-form-fallback-header__icon']} alt={title} />}
        <span className={styles['node-form-fallback-header__title']}>{title}</span>
        <IconButton data-testid="close-side-bar" kind="ghost" label="Close" onClick={onClose}>
          <Close />
        </IconButton>
      </div>
      <ErrorNotification title="This node cannot be configured" />
      <ErrorDetails message={message} />
    </div>
  );
};
