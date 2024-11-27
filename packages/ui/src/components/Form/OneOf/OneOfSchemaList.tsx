import { MenuToggle, MenuToggleElement, Text, TextContent, TextVariants } from '@patternfly/react-core';
import { FunctionComponent, PropsWithChildren, Ref, useCallback, useEffect, useMemo, useState } from 'react';
import { OneOfSchemas } from '../../../utils/get-oneof-schema-list';
import { isDefined } from '../../../utils/is-defined';
import { Typeahead, TypeaheadOptions } from '../../Typeahead';
import { SchemaService } from '../schema.service';
import './OneOfSchemaList.scss';

interface OneOfComponentProps extends PropsWithChildren {
  name: string;
  oneOfSchemas: OneOfSchemas[];
  selectedSchemaName?: string;
  onSchemaChanged: (name: string | undefined) => void;
}

export const OneOfSchemaList: FunctionComponent<OneOfComponentProps> = ({
  name,
  oneOfSchemas,
  selectedSchemaName,
  onSchemaChanged,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const onSelect = useCallback(
    (value: string) => {
      setIsOpen(false);
      onSchemaChanged(undefined);
      onSchemaChanged(value);
    },
    [onSchemaChanged],
  );

  const onToggleClick = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const toggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle
        id={`${name}-oneof-toggle`}
        data-testid={`${name}-oneof-toggle`}
        className="oneof-toggle"
        ref={toggleRef}
        onClick={onToggleClick}
        isFullWidth
        isExpanded={isOpen}
      >
        {selectedSchemaName || (
          <TextContent>
            <Text component={TextVariants.small}>{SchemaService.DROPDOWN_PLACEHOLDER}</Text>
          </TextContent>
        )}
      </MenuToggle>
    ),
    [isOpen, name, onToggleClick, selectedSchemaName],
  );

  const options = useMemo(() => {
    return oneOfSchemas.map((schemaDef): TypeaheadOptions => {
      return {
        value: schemaDef.name,
        description: schemaDef.description,
        isSelected: schemaDef.name === selectedSchemaName,
      };
    });
  }, [oneOfSchemas, selectedSchemaName]);

  useEffect(() => {
    if (oneOfSchemas.length === 1 && isDefined(oneOfSchemas[0]) && !selectedSchemaName) {
      onSchemaChanged(oneOfSchemas[0].name);
    }
  }, [onSchemaChanged, oneOfSchemas, selectedSchemaName]);

  if (oneOfSchemas.length === 1) {
    return children;
  }

  return (
    <>
      {/* <Dropdown
        id={`${name}-oneof-select`}
        data-testid={`${name}-oneof-select`}
        isOpen={isOpen}
        selected={selectedSchemaName}
        onSelect={onSelect}
        onOpenChange={setIsOpen}
        toggle={toggle}
        isScrollable
      >
        <DropdownList data-testid={`${name}-oneof-select-dropdownlist`}>
          {oneOfSchemas.map((schemaDef) => {
            return (
              <DropdownItem
                data-testid={`${name}-oneof-select-dropdownlist-${schemaDef.name}`}
                key={schemaDef.name}
                value={schemaDef.name}
                description={schemaDef.description}
              >
                {schemaDef.name}
              </DropdownItem>
            );
          })}
        </DropdownList>
      </Dropdown> */}

      <Typeahead
        value={selectedSchemaName}
        options={options}
        canCreateNewOption={false}
        data-testid={`${name}-oneof-select`}
        onChange={onSelect}
      />

      {children}
    </>
  );
};
