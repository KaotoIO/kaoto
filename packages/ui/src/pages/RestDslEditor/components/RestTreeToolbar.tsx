import { Add, TrashCan } from '@carbon/icons-react';
import { MenuButton, MenuItem, MenuItemDivider } from '@carbon/react';
import { FunctionComponent, RefObject, useLayoutEffect, useMemo, useRef } from 'react';

import { BaseVisualEntity } from '../../../models';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { IRestTreeSelection } from './RestTree';

/**
 * Props for the RestTreeToolbar component.
 */
export interface RestTreeToolbarProps {
  entities: BaseVisualEntity[];
  selectedElement?: IRestTreeSelection;
  launcherButtonRef?: RefObject<HTMLButtonElement | null>;
  onAddRestConfiguration: () => void;
  onAddRest: () => void;
  onAddMethodClick: () => void;
  onDelete: () => void;
}

/**
 * Toolbar component for the REST tree view.
 * Provides actions to add REST configurations, services, methods, and delete selected items.
 */
export const RestTreeToolbar: FunctionComponent<RestTreeToolbarProps> = ({
  entities,
  selectedElement,
  launcherButtonRef,
  onAddRestConfiguration,
  onAddRest,
  onAddMethodClick,
  onDelete,
}) => {
  const menuButtonContainerRef = useRef<HTMLDivElement>(null);

  /**
   * The page owns the AddMethodModal and uses launcherButtonRef to restore focus
   * to the "Actions" trigger when the modal closes. MenuButton forwards its ref to
   * the container element, so point the page-owned launcher ref at the actual
   * trigger button on every render. Adding an operation rebuilds the REST tree and
   * remounts this toolbar; the new instance re-points the stable page-owned ref at
   * the new button, which lets Carbon restore focus natively across all paths.
   */
  useLayoutEffect(() => {
    if (launcherButtonRef) {
      launcherButtonRef.current = menuButtonContainerRef.current?.querySelector('button') ?? null;
    }
  });

  /** Checks if a REST configuration already exists */
  const hasRestConfiguration = useMemo(
    () => entities.some((entity) => entity instanceof CamelRestConfigurationVisualEntity),
    [entities],
  );

  /** Gets the selected REST entity if a REST service or method is selected */
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
      <MenuButton ref={menuButtonContainerRef} kind="tertiary" label="Actions" data-testid="rest-tree-toolbar-menu">
        <MenuItem
          label="Add Configuration"
          renderIcon={Add}
          onClick={onAddRestConfiguration}
          disabled={hasRestConfiguration}
          data-testid="add-rest-configuration-btn"
        />
        <MenuItem label="Add Service" renderIcon={Add} onClick={onAddRest} data-testid="add-rest-service-btn" />
        <MenuItem
          label="Add Operation"
          renderIcon={Add}
          onClick={onAddMethodClick}
          disabled={!selectedRestEntity}
          data-testid="add-rest-operation-btn"
        />
        <MenuItemDivider />
        <MenuItem kind="danger" label="Delete" renderIcon={TrashCan} onClick={onDelete} disabled={!selectedElement} />
      </MenuButton>
    </div>
  );
};
