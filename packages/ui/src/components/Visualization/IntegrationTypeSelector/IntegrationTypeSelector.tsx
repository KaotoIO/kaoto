import { MenuToggleElement, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, Ref, useCallback, useContext, useState } from 'react';

import { sourceSchemaConfig, SourceSchemaType } from '../../../models/camel';
import { EntitiesContext } from '../../../providers/entities.provider';

const DSL_LIST = [SourceSchemaType.Route, SourceSchemaType.Kamelet, SourceSchemaType.Pipe, SourceSchemaType.Test];

interface IntegrationTypeOption {
  description: string;
  isDisabled: boolean;
  labelSuffix: string;
  testIdPrefix: string;
}

interface IntegrationTypeSelectorProps {
  id: string;
  onSelect?: (value: SourceSchemaType) => void;
  toggle: (ref: Ref<MenuToggleElement>, isOpen: boolean, onToggle: () => void) => React.ReactElement;
  getOption: (sourceType: SourceSchemaType) => IntegrationTypeOption;
  selectListDataTestId?: string;
  style?: React.CSSProperties;
}

export const IntegrationTypeSelector: FunctionComponent<IntegrationTypeSelectorProps> = ({
  id,
  onSelect,
  toggle,
  getOption,
  selectListDataTestId,
  style,
}) => {
  const { currentSchemaType } = useContext(EntitiesContext)!;
  const [isOpen, setIsOpen] = useState(false);

  const onToggle = useCallback(() => {
    setIsOpen((open) => !open);
  }, []);

  const handleSelect = useCallback(
    (_event: MouseEvent | undefined, flowType: string | number | undefined) => {
      if (!flowType) {
        return;
      }
      const integrationType = sourceSchemaConfig.config[flowType as SourceSchemaType];

      setIsOpen(false);
      if (integrationType !== undefined) {
        onSelect?.(flowType as SourceSchemaType);
      }
    },
    [onSelect],
  );

  return (
    <Select
      id={id}
      isOpen={isOpen}
      selected={currentSchemaType}
      onSelect={handleSelect}
      onOpenChange={setIsOpen}
      toggle={(ref) => toggle(ref, isOpen, onToggle)}
      style={style}
    >
      <SelectList data-testid={selectListDataTestId}>
        {DSL_LIST.map((sourceType, index) => {
          const sourceSchema = sourceSchemaConfig.config[sourceType];
          const { description, isDisabled, labelSuffix, testIdPrefix } = getOption(sourceType);

          return (
            <SelectOption
              key={`${testIdPrefix}-${sourceSchema.schema?.name ?? index}`}
              data-testid={`${testIdPrefix}-${sourceSchema.schema?.name ?? sourceSchema.name}`}
              itemId={sourceType}
              description={<span style={{ wordBreak: 'keep-all' }}>{description}</span>}
              isDisabled={isDisabled}
            >
              {sourceSchema.name}
              {labelSuffix}
            </SelectOption>
          );
        })}
      </SelectList>
    </Select>
  );
};
