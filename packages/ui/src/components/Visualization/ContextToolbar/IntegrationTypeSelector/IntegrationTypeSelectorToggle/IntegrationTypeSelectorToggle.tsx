import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, RefObject, useCallback, useContext, useState } from 'react';
import { ISourceSchema, sourceSchemaConfig, SourceSchemaType } from '../../../../../models/camel';
import { EntitiesContext } from '../../../../../providers/entities.provider';
import { getSupportedDsls } from '../../../../../serializers/serializer-dsl-lists';

interface ISourceTypeSelector {
  onSelect?: (value: SourceSchemaType) => void;
}

export const IntegrationTypeSelectorToggle: FunctionComponent<ISourceTypeSelector> = (props) => {
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
        props.onSelect?.(flowType as SourceSchemaType);
      }
    },
    [props],
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
          const isOptionDisabled = sourceSchema.name === currentFlowType.name;

          return (
            <SelectOption
              key={`integration-type-${sourceSchema.schema?.name ?? index}`}
              data-testid={`integration-type-${sourceSchema.schema?.name}`}
              itemId={sourceType}
              description={
                <span className="pf-v6-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
                  {sourceSchemaConfig.config[sourceType as SourceSchemaType].description}
                </span>
              }
              isDisabled={isOptionDisabled}
            >
              {sourceSchema.name}
              {isOptionDisabled && ' (current integration type)'}
            </SelectOption>
          );
        })}
      </SelectList>
    </Select>
  );
};
