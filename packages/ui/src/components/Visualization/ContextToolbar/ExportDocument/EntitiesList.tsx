import { Divider, Icon, MenuItemAction, SelectGroup, SelectList, SelectOption } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';
import { BaseCamelEntity } from '../../../../models/camel/entities';
import { DocumentationEntity } from '../../../../models/documentation';

export type IEntityVisibility = {
  entity: BaseCamelEntity;
  isVisible: boolean;
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
  const allEntitiesVisible = !documentationEntities.find((e) => !e.isVisible);

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
                  <EyeIcon title={`Hide ${entityLabel}`} data-testid={`toggle-btn-${entityLabel}-visible`} />
                </Icon>
              ) : (
                <Icon isInline>
                  <EyeSlashIcon title={`Show ${entityLabel}`} data-testid={`toggle-btn-${entityLabel}-hidden`} />
                </Icon>
              )
            }
            actionId="toggle"
            aria-label="toggle"
            onClick={(event) => {
              onToggleVisibility(entityIndex);
              /** Required to avoid closing the Dropdown after clicking in the icon */
              event.stopPropagation();
            }}
          />
        }
      >
        {entityIndex !== undefined ? entityLabel : isVisible ? 'Hide All' : 'Show All'}
      </SelectOption>
    );
  };

  return (
    <>
      <EntityOption
        key={`entity-option-all`}
        entityLabel="all"
        isVisible={allEntitiesVisible}
        onToggleVisibility={() => onToggleAll()}
      />
      <Divider />
      <SelectGroup>
        <SelectList>
          {documentationEntities.map((docEntity, index) => (
            <EntityOption
              key={`entity-option-${docEntity.label}`}
              entityLabel={docEntity.label}
              isVisible={docEntity.isVisible}
              entityIndex={index}
              onToggleVisibility={(index) => onToggleVisibility(index!)}
            />
          ))}
        </SelectList>
      </SelectGroup>
    </>
  );
};
