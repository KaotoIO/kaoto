import { Add, TrashCan } from '@carbon/icons-react';
import { MenuButton, MenuItem, MenuItemDivider } from '@carbon/react';
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
    <div className="rest-tree-toolbar">
      <MenuButton kind="tertiary" label="Actions">
        <MenuItem
          label="Add Configuration"
          renderIcon={Add}
          onClick={onAddRestConfiguration}
          disabled={hasRestConfiguration}
        />
        <MenuItem label="Add Service" renderIcon={Add} onClick={onAddRest} />
        <MenuItem label="Add Operation" renderIcon={Add} onClick={openAddMethodModal} disabled={!selectedRestEntity} />
        <MenuItemDivider />
        <MenuItem kind="danger" label="Delete" renderIcon={TrashCan} onClick={onDelete} disabled={!selectedElement} />
      </MenuButton>
      {isAddMethodModalOpen && <AddMethodModal onClose={closeAddMethodModal} onAddMethod={onAddMethod} />}
    </div>
  );
};
