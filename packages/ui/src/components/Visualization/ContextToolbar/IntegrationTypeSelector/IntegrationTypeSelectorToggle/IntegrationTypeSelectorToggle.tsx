import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, RefObject, useCallback, useContext, useState } from 'react';

import { useRuntimeContext } from '../../../../../hooks/useRuntimeContext/useRuntimeContext';
import { ISourceSchema, sourceSchemaConfig, SourceSchemaType } from '../../../../../models/camel';
import { EntitiesContext } from '../../../../../providers/entities.provider';
import { getSupportedDsls } from '../../../../../serializers/serializer-dsl-lists';
import { requiresCatalogChange } from '../../../../../utils/catalog-helper';

interface ISourceTypeSelector {
  onSelect?: (value: SourceSchemaType, changeCatalog: boolean) => void;
}

export const IntegrationTypeSelectorToggle: FunctionComponent<ISourceTypeSelector> = (props) => {
  const runtimeContext = useRuntimeContext();
  const { selectedCatalog } = runtimeContext;
  const { currentSchemaType, camelResource } = useContext(EntitiesContext)!;
  const currentFlowType: ISourceSchema = sourceSchemaConfig.config[currentSchemaType];
  const [isOpen, setIsOpen] = useState(false);
  const dslEntries = getSupportedDsls(camelResource);

  const onSelect = useCallback(
    (_event: MouseEvent | undefined, flowType: string | number | undefined) => {
      if (!flowType) {
        return;
      }
      const integrationType = sourceSchemaConfig.config[flowType as SourceSchemaType];

      setIsOpen(false);
      if (integrationType !== undefined) {
        props.onSelect?.(
          flowType as SourceSchemaType,
          requiresCatalogChange(flowType as SourceSchemaType, selectedCatalog),
        );
      }
    },
    [props, selectedCatalog],
  );

  const toggle = (toggleRef: RefObject<HTMLButtonElement>) => (
    <MenuToggle
      data-testid="integration-type-list-dropdown"
      ref={toggleRef}
      onClick={() => {
        setIsOpen(!isOpen);
      }}
      isExpanded={isOpen}
    >
      {sourceSchemaConfig.config[currentSchemaType].name}
    </MenuToggle>
  );

  return (
    <Select
      id="integration-type-list-select"
      isOpen={isOpen}
      selected={currentSchemaType}
      onSelect={onSelect}
      onOpenChange={setIsOpen}
      toggle={toggle}
      style={{ width: '20rem' }}
    >
      <SelectList>
        {dslEntries.map((sourceType, index) => {
          const sourceSchema = sourceSchemaConfig.config[sourceType];
          const isCurrentType = sourceSchema.name === currentFlowType.name;
          const changeCatalog = requiresCatalogChange(sourceType, selectedCatalog);

          return (
            <SelectOption
              key={`integration-type-${sourceSchema.schema?.name ?? index}`}
              data-testid={`integration-type-${sourceSchema.schema?.name ?? sourceSchema.name}`}
              itemId={sourceType}
              description={
                <span className="pf-v6-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
                  {sourceSchemaConfig.config[sourceType as SourceSchemaType].description}
                </span>
              }
              isDisabled={isCurrentType}
            >
              {sourceSchema.name}
              {changeCatalog && !isCurrentType && ' (in different catalog)'}
              {isCurrentType && ' (current integration type)'}
            </SelectOption>
          );
        })}
      </SelectList>
    </Select>
  );
};
