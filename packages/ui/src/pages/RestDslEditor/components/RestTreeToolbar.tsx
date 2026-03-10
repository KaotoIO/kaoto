import { Add, TrashCan } from '@carbon/icons-react';
import { Button } from '@carbon/react';
import { FunctionComponent, useMemo } from 'react';

import { useToggle } from '../../../hooks/useToggle';
import { BaseVisualCamelEntity } from '../../../models';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { AddMethodFormModel } from './add-method-schema';
import { AddMethodModal } from './AddMethodModal';
import { IRestTreeSelection } from './RestTree';

export interface RestTreeToolbarProps {
  entities: BaseVisualCamelEntity[];
  selectedElement?: IRestTreeSelection;
  onAddRestConfiguration: () => void;
  onAddRest: () => void;
  onAddMethod: (model: AddMethodFormModel) => void;
  onDelete: () => void;
}

export const RestTreeToolbar: FunctionComponent<RestTreeToolbarProps> = ({
  entities,
  selectedElement,
  onAddRestConfiguration,
  onAddRest,
  onAddMethod,
  onDelete,
}) => {
  const {
    state: isAddMethodModalOpen,
    toggleOn: openAddMethodModal,
    toggleOff: closeAddMethodModal,
  } = useToggle(false);

  const hasRestConfiguration = useMemo(
    () => entities.some((entity) => entity instanceof CamelRestConfigurationVisualEntity),
    [entities],
  );

  const selectedRestEntity = useMemo(() => {
    if (!selectedElement) return undefined;

    const entity = entities.find((e) => e.id === selectedElement.entityId);
    if (entity instanceof CamelRestVisualEntity) {
      // Check if the root path or a method is selected
      if (
        selectedElement.modelPath === CamelRestVisualEntity.ROOT_PATH ||
        selectedElement.modelPath.startsWith('rest.')
      ) {
        return entity;
      }
    }
    return undefined;
  }, [entities, selectedElement]);

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <Button
          kind="tertiary"
          size="sm"
          renderIcon={Add}
          iconDescription="Add RestConfiguration"
          onClick={onAddRestConfiguration}
          disabled={hasRestConfiguration}
          title={hasRestConfiguration ? 'RestConfiguration already exists' : 'Add RestConfiguration'}
        >
          Add RestConfiguration
        </Button>

        <Button kind="tertiary" size="sm" renderIcon={Add} iconDescription="Add Rest" onClick={onAddRest}>
          Add Rest
        </Button>

        <Button
          kind="tertiary"
          size="sm"
          renderIcon={Add}
          iconDescription="Add Method"
          onClick={openAddMethodModal}
          disabled={!selectedRestEntity}
          title={selectedRestEntity ? 'Add Method' : 'Select a Rest entity to add a method'}
        >
          Add Method
        </Button>

        <Button
          kind="danger--ghost"
          size="sm"
          iconDescription="Delete"
          renderIcon={TrashCan}
          onClick={onDelete}
          disabled={!selectedElement}
        >
          Delete
        </Button>
      </div>

      {isAddMethodModalOpen && <AddMethodModal onClose={closeAddMethodModal} onAddMethod={onAddMethod} />}
    </>
  );
};
