import './CanvasForm.scss';

import { Close } from '@carbon/icons-react';
import { IconButton } from '@carbon/react';
import { FunctionComponent, useCallback, useContext, useEffect, useRef } from 'react';

import { IVisualizationNode } from '../../../../models';
import { VisibleFlowsContext } from '../../../../providers';
import { CanvasSidePanelErrorBoundary } from '../CanvasSidePanelErrorBoundary';
import { CanvasFormBody } from './CanvasFormBody';

interface CanvasFormProps {
  vizNode: IVisualizationNode;
  onClose: () => void;
}

export const CanvasForm: FunctionComponent<CanvasFormProps> = ({ vizNode, onClose }) => {
  const { visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const flowIdRef = useRef<string | undefined>(undefined);
  const title = vizNode.getNodeTitle();

  /** Store the flow's initial Id */
  useEffect(() => {
    flowIdRef.current = vizNode.getId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCloseFn = useCallback(() => {
    onClose();
    const newId = vizNode.getId();
    if (typeof flowIdRef.current === 'string' && typeof newId === 'string' && flowIdRef.current !== newId) {
      visualFlowsApi.renameFlow(flowIdRef.current, newId);
    }
  }, [onClose, visualFlowsApi, vizNode]);

  return (
    <CanvasSidePanelErrorBoundary
      key={vizNode.id}
      onClose={onCloseFn}
      title={title || undefined}
      errorTitle="This node cannot be configured"
    >
      <div className="canvas-form">
        <div className="canvas-form__header">
          <div className="form-header-row">
            <div className="form-header">
              {vizNode.data.iconUrl && (
                <img src={vizNode.data.iconUrl} className={`form-header__icon-${vizNode.id}`} alt={title} />
              )}
              <h2 className="form-header__title">{title}</h2>
            </div>
            <IconButton
              data-testid="close-side-bar"
              kind="ghost"
              size="sm"
              label="Close"
              onClick={onCloseFn}
              className="canvas-header-close"
            >
              <Close />
            </IconButton>
          </div>
        </div>

        <div className="canvas-form__body">
          <CanvasFormBody vizNode={vizNode} onDismiss={onCloseFn} />
        </div>
      </div>
    </CanvasSidePanelErrorBoundary>
  );
};
