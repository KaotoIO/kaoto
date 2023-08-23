import { Title } from '@patternfly/react-core';
import { FunctionComponent, useEffect } from 'react';
import { Canvas } from '../../components/Canvas';
import { useFlowsStore } from '../../store';
import './CanvasPage.scss';
import { CamelRoute, Step } from '../../flows';

export const CanvasPage: FunctionComponent = () => {
  const { flows, addFlow } = useFlowsStore((state) => state);

  useEffect(() => {
    const camelRoute = new CamelRoute();

    const choiceStep = new Step({ id: 'choice', name: 'choice' });
    const whenStep = new Step({ id: 'when', name: 'when' });
    const otherwiseStep = new Step({ id: 'otherwise', name: 'otherwise' });
    const whenLogStep = new Step({ id: 'whenLog', name: 'whenLog' });
    const otherwiseLogStep = new Step({ id: 'otherwiseLog', name: 'otherwiseLog' });

    const logStep = new Step({ id: 'log', name: 'log' });
    const timerStep = new Step({ id: 'timer', name: 'timer' });

    choiceStep._getSteps().push(whenStep, otherwiseStep);
    whenStep._getSteps().push(whenLogStep);
    otherwiseStep._getSteps().push(otherwiseLogStep);
    timerStep._getSteps().push(choiceStep, logStep);

    camelRoute.getSteps().push(timerStep);
    addFlow(camelRoute);
  }, [addFlow]);

  return (
    <div className="canvasPage">
      <Title headingLevel="h1">Visualization</Title>

      <Canvas className="canvasPage__canvas" flows={flows} />
    </div>
  );
};
