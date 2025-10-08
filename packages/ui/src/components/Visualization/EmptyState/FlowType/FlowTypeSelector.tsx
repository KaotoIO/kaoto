import './FlowTypeSelector.scss';

import {
  MenuToggle,
  MenuToggleAction,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, PropsWithChildren, Ref, useCallback, useContext, useState } from 'react';

import { ISourceSchema, sourceSchemaConfig, SourceSchemaType } from '../../../../models/camel';
import { EntitiesContext } from '../../../../providers/entities.provider';
import { getSupportedDsls } from '../../../../serializers/serializer-dsl-lists';

interface ISourceTypeSelector extends PropsWithChildren {
  isStatic?: boolean;
  onSelect?: (value: SourceSchemaType) => void;
}

export const FlowTypeSelector: FunctionComponent<ISourceTypeSelector> = (props) => {
  const { currentSchemaType, visualEntities, camelResource } = useContext(EntitiesContext)!;
  const totalFlowsCount = visualEntities.length;
  const currentFlowType: ISourceSchema = sourceSchemaConfig.config[currentSchemaType];
  const dslList = getSupportedDsls(camelResource);
  const [isOpen, setIsOpen] = useState(false);

  /** Toggle the DSL dropdown */
  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  /** Selecting a DSL checking the existing flows */
  const onSelect = useCallback(
    (_event: MouseEvent | undefined, flowType: string | number | undefined) => {
      if (flowType) {
        const dsl = sourceSchemaConfig.config[flowType as SourceSchemaType];

        setIsOpen(false);
        if (typeof props.onSelect === 'function' && dsl !== undefined) {
          props.onSelect(flowType as SourceSchemaType);
        }
      }
    },
    [props],
  );

  /** Selecting the same DSL directly*/
  const onNewSameTypeRoute = useCallback(() => {
    onSelect(undefined, currentSchemaType);
  }, [onSelect, currentSchemaType]);

  /** Override function to provide more useful help texts than available via schema */
  const getDescriptionForType = (type: string) => {
    switch (type) {
      case SourceSchemaType.Route:
        return 'Defines an executable integration flow by declaring a source (starter) and followed by a sequence of actions (or steps). Actions can include data manipulations, EIPs (integration patterns) and internal or external calls.';
      case SourceSchemaType.Kamelet:
        return 'Defines a reusable Camel route as a building block. Kamelets can not be executed on their own, they are used as sources, actions or sinks in Camel Routes or Pipes.';
      case SourceSchemaType.Test:
        return 'Defines a Citrus test case to verify Camel Routes or Pipes.';
      case SourceSchemaType.Pipe:
      case SourceSchemaType.KameletBinding:
        return 'Defines a sequence of concatenated Kamelets to form start to finish integration flows. Pipes are a more abstract level of defining integration flows, by chosing and configuring Kamelets.';
      case SourceSchemaType.Integration:
        return 'An integration defines a Camel route in a CRD file.';
      default:
        return undefined;
    }
  };

  const toggle = (toggleRef: Ref<MenuToggleElement>) => (
    <MenuToggle
      data-testid="viz-dsl-list-dropdown"
      ref={toggleRef}
      onClick={onToggleClick}
      isExpanded={isOpen}
      isFullWidth
      splitButtonItems={[
        <MenuToggleAction
          id="dsl-list-btn"
          key="dsl-list-btn"
          data-testid="dsl-list-btn"
          aria-label="DSL list"
          onClick={onNewSameTypeRoute}
          isDisabled={!sourceSchemaConfig.config[currentSchemaType].multipleRoute && totalFlowsCount > 0}
        >
          {props.children}
        </MenuToggleAction>,
      ]}
    />
  );

  return (
    <Select
      id="dsl-list-select"
      isOpen={isOpen}
      selected={currentSchemaType}
      onSelect={onSelect}
      onOpenChange={(isOpen) => {
        setIsOpen(isOpen);
      }}
      toggle={toggle}
    >
      <SelectList>
        {dslList.map((sourceType, index) => {
          const sourceSchema = sourceSchemaConfig.config[sourceType];

          const isOptionDisabled =
            sourceSchema.name === currentFlowType.name && !sourceSchema.multipleRoute && totalFlowsCount > 0;
          return (
            <SelectOption
              key={`dsl-${sourceSchema.schema?.name ?? index}`}
              data-testid={`dsl-${sourceSchema.schema?.name}`}
              itemId={sourceType}
              description={
                <span className="dsl-description">
                  {getDescriptionForType(sourceType) !== undefined
                    ? getDescriptionForType(sourceType)
                    : ((sourceSchema.schema?.schema as { description: string }).description ?? '')}
                </span>
              }
              isDisabled={isOptionDisabled}
            >
              {sourceSchema.name}
              {isOptionDisabled && ' (single route only)'}
            </SelectOption>
          );
        })}
      </SelectList>
    </Select>
  );
};
