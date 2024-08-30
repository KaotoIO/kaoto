import { Card, CardBody, CardHeader } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { VisibleFlowsContext } from '../../../../providers';
import { ErrorBoundary } from '../../../ErrorBoundary';
import { CanvasNode } from '../canvas.models';
import './CanvasForm.scss';
import { CanvasFormBody } from './CanvasFormBody';
import { CanvasFormHeader } from './CanvasFormHeader';

interface CanvasFormProps {
  selectedNode: CanvasNode;
  onClose?: () => void;
}

export const CanvasForm: FunctionComponent<CanvasFormProps> = (props) => {
  const { visualFlowsApi } = useContext(VisibleFlowsContext)!;
  const flowIdRef = useRef<string | undefined>(undefined);

  const visualComponentSchema = useMemo(() => {
    const answer = props.selectedNode.data?.vizNode?.getComponentSchema();
    // Overriding parameters with an empty object When the parameters property is mistakenly set to null
    if (answer?.definition?.parameters === null) {
      answer!.definition.parameters = {};
    }
    return answer;
  }, [props.selectedNode.data?.vizNode]);
  const title = visualComponentSchema?.title;

  /** Store the flow's initial Id */
  useEffect(() => {
    flowIdRef.current = props.selectedNode.data?.vizNode?.getId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onClose = useCallback(() => {
    props.onClose?.();
    const newId = props.selectedNode.data?.vizNode?.getId();
    if (typeof flowIdRef.current === 'string' && typeof newId === 'string' && flowIdRef.current !== newId) {
      visualFlowsApi.renameFlow(flowIdRef.current, newId);
    }
  }, [props, visualFlowsApi]);

  return (
    <ErrorBoundary key={props.selectedNode.id} fallback={<p>This node cannot be configured yet</p>}>
      <Card className="canvas-form">
        <CardHeader>
          <CanvasFormHeader
            nodeId={props.selectedNode.id}
            title={title}
            onClose={onClose}
            nodeIcon={props.selectedNode.data?.vizNode?.data?.icon}
          />
        </CardHeader>

        <CardBody className="canvas-form__body">
          <CanvasFormBody selectedNode={props.selectedNode} />
        </CardBody>
      </Card>
    </ErrorBoundary>
  );
};
