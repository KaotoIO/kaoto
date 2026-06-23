import { MenuToggle, MenuToggleElement } from '@patternfly/react-core';
import { FunctionComponent, Ref, useContext } from 'react';

import { useRuntimeContext } from '../../../../../hooks/useRuntimeContext/useRuntimeContext';
import { ISourceSchema, sourceSchemaConfig, SourceSchemaType } from '../../../../../models/camel';
import { EntitiesContext } from '../../../../../providers/entities.provider';
import { requiresCatalogChange } from '../../../../../utils/catalog-helper';
import { IntegrationTypeSelector } from '../../../IntegrationTypeSelector/IntegrationTypeSelector';

interface ISourceTypeSelector {
  onSelect?: (value: SourceSchemaType) => void;
}

export const IntegrationTypeSelectorToggle: FunctionComponent<ISourceTypeSelector> = (props) => {
  const runtimeContext = useRuntimeContext();
  const { selectedCatalog } = runtimeContext;
  const { currentSchemaType } = useContext(EntitiesContext)!;
  const currentFlowType: ISourceSchema = sourceSchemaConfig.config[currentSchemaType];

  const toggle = (toggleRef: Ref<MenuToggleElement>, isOpen: boolean, onToggle: () => void) => (
    <MenuToggle data-testid="integration-type-list-dropdown" ref={toggleRef} onClick={onToggle} isExpanded={isOpen}>
      {sourceSchemaConfig.config[currentSchemaType].name}
    </MenuToggle>
  );

  const getOption = (sourceType: SourceSchemaType) => {
    const sourceSchema = sourceSchemaConfig.config[sourceType];
    const isCurrentType = sourceSchema.name === currentFlowType.name;
    const changeCatalog = requiresCatalogChange(sourceType, selectedCatalog);

    let labelSuffix = '';
    if (isCurrentType) {
      labelSuffix = ' (current integration type)';
    } else if (changeCatalog) {
      labelSuffix = ' (in different catalog)';
    }

    return {
      description: sourceSchema.description ?? '',
      isDisabled: isCurrentType,
      labelSuffix,
      testIdPrefix: 'integration-type',
    };
  };

  return (
    <IntegrationTypeSelector
      id="integration-type-list-select"
      onSelect={props.onSelect}
      toggle={toggle}
      getOption={getOption}
      selectListDataTestId="integration-type-list"
      style={{ width: '20rem' }}
    />
  );
};
