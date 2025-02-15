import { Badge, Icon, MenuToggle, MenuToggleAction, MenuToggleElement, Select } from '@patternfly/react-core';
import { ListIcon } from '@patternfly/react-icons';
import { FunctionComponent, Ref, useState } from 'react';

import { EntitiesList } from './EntitiesList';
import { DocumentationEntity } from '../../../../models/documentation';
import './EntitiesMenu.scss';

type IEntitiesMenu = {
  documentationEntities: DocumentationEntity[];
  onUpdate: (docEntities: DocumentationEntity[]) => void;
};

export const EntitiesMenu: FunctionComponent<IEntitiesMenu> = ({ documentationEntities, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);

  const allEntitiesVisible = !documentationEntities.find((e) => !e.isVisible);
  const visibleEntitiesCount = documentationEntities.filter((e) => e.isVisible).length;
  const totalEntitiesCount = documentationEntities.length;

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onToggleEntityVisibility = (index: number) => {
    documentationEntities[index].isVisible = !documentationEntities[index].isVisible;
    onUpdate(documentationEntities);
  };

  const onToggleAll = () => {
    if (allEntitiesVisible) {
      const updated = documentationEntities.map((docEntity) => {
        docEntity.isVisible = false;
        return docEntity;
      });
      onUpdate(updated);
    } else {
      const updated = documentationEntities.map((docEntity) => {
        docEntity.isVisible = true;
        return docEntity;
      });
      onUpdate(updated);
    }
  };

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      data-testid="entities-list-dropdown"
      ref={toggleRef}
      onClick={onToggleClick}
      isFullWidth
      splitButtonItems={[
        <MenuToggleAction
          id="entities-list-btn"
          key="entities-list-btn"
          data-testid="entities-list-btn"
          aria-label="entities list"
          onClick={onToggleClick}
        >
          <Icon isInline>
            <ListIcon />
          </Icon>
          <span title="Entities" data-testid="entities-list-id" className="pf-v6-u-m-sm">
            Entities
          </span>
          <Badge
            title={`Showing ${visibleEntitiesCount} out of ${totalEntitiesCount} entities`}
            data-testid="entities-list-entity-count"
            isRead
          >
            {visibleEntitiesCount}/{totalEntitiesCount}
          </Badge>
        </MenuToggleAction>,
      ]}
    />
  );

  return (
    <Select
      isScrollable
      id="entities-list-select"
      className="entities-list-select"
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      toggle={toggle}
    >
      <EntitiesList
        documentationEntities={documentationEntities}
        onToggleVisibility={(index) => onToggleEntityVisibility(index)}
        onToggleAll={onToggleAll}
      />
    </Select>
  );
};
