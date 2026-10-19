import './CanvasForm.scss';

import { Card, CardBody, CardHeader } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useRef } from 'react';

import { IVisualizationNode } from '../../../../models';
import { VisibleFlowsContext } from '../../../../providers';
import { ErrorBoundary } from '../../../ErrorBoundary';
import { NodeFormFallback } from '../../../ErrorFallbacks/NodeFormFallback';
import { Anchors } from '../../../registers/anchors';
import { RenderingAnchor } from '../../../RenderingAnchor/RenderingAnchor';
import { CanvasFormBody } from './CanvasFormBody';
import { CanvasFormHeader } from './CanvasFormHeader';

interface CanvasFormProps {
  vizNode: IVisualizationNode;
  onClose: () => void;
}

const renderNodeFormFallback = (error: Error, title: string, iconUrl: string, onClose: () => void) => (
  <NodeFormFallback title={title} iconUrl={iconUrl} onClose={onClose} message={error.message} />
);

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
    <ErrorBoundary
      key={vizNode.id}
      fallback={(error) => renderNodeFormFallback(error, title, vizNode.data.iconUrl ?? '', onCloseFn)}
    >
      <Card className="canvas-form">
        <CardHeader>
          <CanvasFormHeader nodeId={vizNode.id} title={title} onClose={onCloseFn} iconUrl={vizNode.data.iconUrl} />
          <RenderingAnchor anchorTag={Anchors.CanvasFormHeader} vizNode={vizNode} />
        </CardHeader>

        <CardBody className="canvas-form__body">
          <CanvasFormBody vizNode={vizNode} />
        </CardBody>
      </Card>
    </ErrorBoundary>
  );
};
