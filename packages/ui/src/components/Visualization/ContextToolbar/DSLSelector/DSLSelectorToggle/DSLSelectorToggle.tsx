import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, RefObject, useCallback, useContext, useRef, useState } from 'react';
import { ISourceSchema, SourceSchemaType, sourceSchemaConfig } from '../../../../../models/camel';
import { EntitiesContext } from '../../../../../providers/entities.provider';

interface ISourceTypeSelector {
  onSelect?: (value: SourceSchemaType) => void;
}

export const DSLSelectorToggle: FunctionComponent<ISourceTypeSelector> = (props) => {
  const { currentSchemaType } = useContext(EntitiesContext)!;
  const currentFlowType: ISourceSchema = sourceSchemaConfig.config[currentSchemaType];
  const [isOpen, setIsOpen] = useState(false);
  const dslEntriesRef = useRef<Partial<Record<SourceSchemaType, ISourceSchema>>>({
    [SourceSchemaType.Route]: sourceSchemaConfig.config[SourceSchemaType.Route],
    [SourceSchemaType.Kamelet]: sourceSchemaConfig.config[SourceSchemaType.Kamelet],
    [SourceSchemaType.Pipe]: sourceSchemaConfig.config[SourceSchemaType.Pipe],
  });

  const onSelect = useCallback(
    (_event: MouseEvent | undefined, flowType: string | number | undefined) => {
      if (!flowType) {
        return;
      }
      const dsl = sourceSchemaConfig.config[flowType as SourceSchemaType];

      setIsOpen(false);
      if (dsl !== undefined) {
        props.onSelect?.(flowType as SourceSchemaType);
      }
    },
    [props],
  );

  const toggle = (toggleRef: RefObject<HTMLButtonElement>) => (
    <MenuToggle
      data-testid="dsl-list-dropdown"
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
      id="dsl-list-select"
      isOpen={isOpen}
      selected={currentSchemaType}
      onSelect={onSelect}
      onOpenChange={setIsOpen}
      toggle={toggle}
      style={{ width: '20rem' }}
    >
      <SelectList>
        {Object.entries(dslEntriesRef.current).map(([sourceType, sourceSchema], index) => {
          const isOptionDisabled = sourceSchema.name === currentFlowType.name;

          return (
            <SelectOption
              key={`dsl-${sourceSchema.schema?.name ?? index}`}
              data-testid={`dsl-${sourceSchema.schema?.name}`}
              itemId={sourceType}
              description={
                <span className="pf-v5-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
                  {sourceSchemaConfig.config[sourceType as SourceSchemaType].description}
                </span>
              }
              isDisabled={isOptionDisabled}
            >
              {sourceSchema.name}
              {isOptionDisabled && ' (current DSL)'}
            </SelectOption>
          );
        })}
      </SelectList>
    </Select>
  );
};
