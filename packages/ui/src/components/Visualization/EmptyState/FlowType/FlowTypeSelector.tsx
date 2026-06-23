import './FlowTypeSelector.scss';

import { MenuToggle, MenuToggleAction, MenuToggleElement } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, Ref, useContext } from 'react';

import { ISourceSchema, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { IntegrationTypeSelector } from '../../IntegrationTypeSelector/IntegrationTypeSelector';

interface ISourceTypeSelector extends PropsWithChildren {
  onSelect?: (value: SourceSchemaType) => void;
}

export const FlowTypeSelector: FunctionComponent<ISourceTypeSelector> = (props) => {
  const { currentSchemaType, visualEntities } = useContext(EntitiesContext)!;
  const totalFlowsCount = visualEntities.length;
  const currentFlowType: ISourceSchema = sourceSchemaConfig.config[currentSchemaType];

  const toggle = (toggleRef: Ref<MenuToggleElement>, isOpen: boolean, onToggle: () => void) => (
    <MenuToggle
      data-testid="viz-dsl-list-dropdown"
      ref={toggleRef}
      onClick={onToggle}
      isExpanded={isOpen}
      isFullWidth
      splitButtonItems={[
        <MenuToggleAction
          id="dsl-list-btn"
          key="dsl-list-btn"
          data-testid="dsl-list-btn"
          aria-label="DSL list"
          onClick={() => props.onSelect?.(currentSchemaType)}
          isDisabled={!sourceSchemaConfig.config[currentSchemaType].multipleRoute && totalFlowsCount > 0}
        >
          {props.children}
        </MenuToggleAction>,
      ]}
    />
  );

  const getOption = (sourceType: SourceSchemaType) => {
    const sourceSchema = sourceSchemaConfig.config[sourceType];
    const isOptionDisabled =
      sourceSchema.name === currentFlowType.name && !sourceSchema.multipleRoute && totalFlowsCount > 0;

    return {
      description: sourceSchema.description ?? '',
      isDisabled: isOptionDisabled,
      labelSuffix: isOptionDisabled ? ' (single route only)' : '',
      testIdPrefix: 'dsl',
    };
  };

  return (
    <IntegrationTypeSelector id="dsl-list-select" onSelect={props.onSelect} toggle={toggle} getOption={getOption} />
  );
};
