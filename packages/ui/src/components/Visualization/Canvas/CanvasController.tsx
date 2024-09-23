import { VisualizationProvider } from '@patternfly/react-topology';
import { FunctionComponent, PropsWithChildren, ReactNode, useMemo } from 'react';
import { BaseVisualCamelEntity } from '../../../models/visualization/base-visual-entity';
import { Canvas } from './Canvas';
import './Canvas.scss';
import { ControllerService } from './controller.service';

interface CanvasProps {
  contextToolbar?: ReactNode;
  entities: BaseVisualCamelEntity[];
}

export const CanvasController: FunctionComponent<PropsWithChildren<CanvasProps>> = ({ entities }) => {
  const controller = useMemo(() => ControllerService.createController(), []);

  return (
    <VisualizationProvider controller={controller}>
      <Canvas entities={entities} />
    </VisualizationProvider>
  );
};
