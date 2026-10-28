import './EntitiesList.scss';

import { View, ViewOff } from '@carbon/icons-react';
import { Divider, Icon, MenuItemAction, SelectGroup, SelectList, SelectOption } from '@patternfly/react-core';
import { FunctionComponent } from 'react';

import { DocumentationEntity } from '../../../../models/documentation';

type IEntityLabel = {
  index?: number;
  entityLabel: string;
  isVisible: boolean;
};

const EntityLabel: FunctionComponent<IEntityLabel> = ({ index, entityLabel, isVisible }) => {
  let label = entityLabel;
  if (index === undefined) label = isVisible ? 'Hide All' : 'Show All';
  return label;
};

type IEntityOption = {
  entityLabel: string;
  isVisible: boolean;
  entityIndex?: number;
  onToggleVisibility: (index?: number) => void;
};

const EntityOption: FunctionComponent<IEntityOption> = ({
  entityLabel,
  isVisible,
  entityIndex,
  onToggleVisibility,
}) => {
  return (
    <SelectOption
      data-testid={`option-${entityLabel}`}
      actions={
        <MenuItemAction
          icon={
            isVisible ? (
              <Icon isInline>
                <View title={`Hide ${entityLabel}`} data-testid={`toggle-btn-${entityLabel}-hide`} />
              </Icon>
            ) : (
              <Icon isInline>
                <ViewOff title={`Show ${entityLabel}`} data-testid={`toggle-btn-${entityLabel}-show`} />
              </Icon>
            )
          }
          actionId="toggle"
          aria-label={isVisible ? `Hide ${entityLabel}` : `Show ${entityLabel}`}
          onClick={(event) => {
            onToggleVisibility(entityIndex);
            /** Required to avoid closing the Dropdown after clicking in the icon */
            event.stopPropagation();
          }}
        />
      }
    >
      <EntityLabel index={entityIndex} entityLabel={entityLabel} isVisible={isVisible} />
    </SelectOption>
  );
};

type IEntitiesList = {
  documentationEntities: DocumentationEntity[];
  onToggleVisibility: (index: number) => void;
  onToggleAll: () => void;
};

export const EntitiesList: FunctionComponent<IEntitiesList> = ({
  documentationEntities,
  onToggleVisibility,
  onToggleAll,
}) => {
  const allEntitiesVisible = !documentationEntities.some((e) => !e.isVisible);

  return (
    <>
      <EntityOption
        key="entity-option-all"
        entityLabel="all"
        isVisible={allEntitiesVisible}
        onToggleVisibility={() => {
          onToggleAll();
        }}
      />
      <Divider />
      <SelectGroup className="entities-select-list">
        <SelectList>
          {documentationEntities.map((docEntity, index) => (
            <EntityOption
              key={`entity-option-${docEntity.entity!.id}`}
              entityLabel={docEntity.label}
              isVisible={docEntity.isVisible}
              entityIndex={index}
              onToggleVisibility={(index) => {
                if (index !== undefined) onToggleVisibility(index);
              }}
            />
          ))}
        </SelectList>
      </SelectGroup>
    </>
  );
};
