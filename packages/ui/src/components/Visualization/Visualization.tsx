import { FunctionComponent, PropsWithChildren, useState } from 'react';
import { VisualizationCanvas } from './VisualizationCanvas';
import './VisualizationCanvas.scss';
import { CamelRoute } from '../../camel-entities';
import { Button } from '@patternfly/react-core';

interface CanvasProps {
  className?: string;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const [entities, setEntities] = useState<CamelRoute[]>([]);

  return (
    <div className={`canvasSurface ${props.className ?? ''}`}>
      <VisualizationCanvas
        contextToolbar={
          <Button
            onClick={() => {
              const newEntity = new CamelRoute();
              newEntity.id = 'new-route';

              setEntities([...entities, newEntity]);
            }}
          >
            New Camel route
          </Button>
        }
        entities={entities}
      />
    </div>
  );
};
