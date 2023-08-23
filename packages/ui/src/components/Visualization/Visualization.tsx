import { Button, Modal } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, useCallback, useState } from 'react';
import { CamelRoute, Step } from '../../camel-entities';
import { getCamelRandomId } from '../../camel-utils/camel-random-id';
import { Catalog, ITile } from '../Catalog';
import { VisualizationCanvas } from './VisualizationCanvas';
import './VisualizationCanvas.scss';

interface CanvasProps {
  className?: string;
  tiles: Record<string, ITile[]>;
}

export const Visualization: FunctionComponent<PropsWithChildren<CanvasProps>> = (props) => {
  const [entities, setEntities] = useState<CamelRoute[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCamelEntity, setSelectedCamelEntity] = useState<CamelRoute | undefined>(undefined);

  const onTileClick = useCallback(
    (tile: ITile) => {
      if (selectedCamelEntity === undefined) {
        return;
      }

      setIsModalOpen(false);
      const firstStep = new Step({ name: tile.name });
      selectedCamelEntity._addStep(firstStep);
      setEntities([...entities, selectedCamelEntity]);
    },
    [entities, selectedCamelEntity],
  );

  const handleModalToggle = useCallback(() => {
    setIsModalOpen(!isModalOpen);
  }, [isModalOpen]);

  return (
    <div className={`canvasSurface ${props.className ?? ''}`}>
      <VisualizationCanvas
        contextToolbar={
          <Button
            onClick={() => {
              setIsModalOpen(true);
              const newEntity = new CamelRoute();
              newEntity.id = getCamelRandomId('route');
              setSelectedCamelEntity(newEntity);
            }}
          >
            New Camel route
          </Button>
        }
        entities={entities}
      />

      <Modal title="Catalog browser" isOpen={isModalOpen} onClose={handleModalToggle} ouiaId="BasicModal">
        <Catalog tiles={props.tiles} onTileClick={onTileClick} />
      </Modal>
    </div>
  );
};
