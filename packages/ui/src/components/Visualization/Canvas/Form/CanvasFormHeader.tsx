import './CanvasFormHeader.scss';

import { Close } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent } from 'react';

interface CanvasFormHeaderProps {
  nodeId: string;
  iconUrl: string;
  title?: string;
  onClose?: () => void;
}

export const CanvasFormHeader: FunctionComponent<CanvasFormHeaderProps> = ({ nodeId, iconUrl, title, onClose }) => {
  return (
    <div className="form-header-row">
      <div className="form-header">
        {iconUrl && <img src={iconUrl} className={`form-header__icon-${nodeId}`} alt={title} />}
        <h2 className="form-header__title">{title}</h2>
      </div>
      <IconButton
        data-testid="close-side-bar"
        kind="ghost"
        size="sm"
        label="Close"
        onClick={onClose}
        className="canvas-header-close"
      >
        <Close />
      </IconButton>
    </div>
  );
};
