import './CatalogSelectorField.scss';

import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { Menu, MenuContainer, MenuContent, MenuGroup, MenuItem, MenuToggle } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { useRuntimeContext } from '../../../../../../hooks/useRuntimeContext/useRuntimeContext';
import { SourceSchemaType } from '../../../../../../models/camel/source-schema-type';
import { findCatalog } from '../../../../../../utils/catalog-helper';
import { getRuntimeIcon } from '../../../../../Icons/RuntimeIcon';

interface ICatalogSelectorField extends FieldProps {
  schemaType: SourceSchemaType;
  validRuntimes: string[];
}

const CatalogSelectorField: FunctionComponent<ICatalogSelectorField> = ({
  propName,
  required,
  schemaType,
  validRuntimes,
}) => {
  const { schema } = useContext(SchemaContext);
  const { value: storedValue, onChange, disabled } = useFieldValue<string | undefined>(propName);
  const { catalogLibrary } = useRuntimeContext();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const catalogOptions = useMemo(() => {
    return (catalogLibrary?.definitions ?? []).filter((catalog) => validRuntimes.includes(catalog.runtime));
  }, [catalogLibrary?.definitions, validRuntimes]);

  const value = storedValue || findCatalog(schemaType, catalogLibrary)?.name;

  // Group catalogs by runtime
  const groupedCatalogs = useMemo(() => {
    return catalogOptions.reduce(
      (acc, catalog) => {
        if (!acc[catalog.runtime]) {
          acc[catalog.runtime] = [];
        }
        acc[catalog.runtime].push(catalog);
        return acc;
      },
      {} as Record<string, CatalogLibraryEntry[]>,
    );
  }, [catalogOptions]);

  const onSelect = useCallback(
    (_event: unknown, catalogName: string | number | undefined) => {
      if (!catalogName || typeof catalogName !== 'string') return;

      onChange(catalogName);
      setIsOpen(false);
    },
    [onChange],
  );

  // Handle loading state
  if (!catalogLibrary) {
    return (
      <FieldWrapper
        propName={propName}
        required={required}
        title={schema.title}
        type="object"
        description={schema.description}
      >
        <div>Loading catalogs...</div>
      </FieldWrapper>
    );
  }

  return (
    <FieldWrapper
      propName={propName}
      required={required}
      title={schema.title}
      type="string"
      description={schema.description}
    >
      <MenuContainer
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        menu={
          <Menu ref={menuRef} onSelect={onSelect} className="cat-select-field">
            <MenuContent>
              {Object.entries(groupedCatalogs).map(([runtime, catalogs]) => (
                <MenuGroup
                  key={runtime}
                  label={
                    <li className="pf-v6-c-menu__list-item dropdown-title pf-v6-c-menu__item" role="none">
                      {getRuntimeIcon(runtime)} {runtime}
                    </li>
                  }
                >
                  {catalogs.map((catalog) => (
                    <MenuItem
                      key={catalog.name}
                      itemId={catalog.name}
                      isSelected={value === catalog.name}
                      selected={value === catalog.name}
                    >
                      {catalog.name}
                    </MenuItem>
                  ))}
                </MenuGroup>
              ))}
            </MenuContent>
          </Menu>
        }
        menuRef={menuRef}
        toggle={
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            isDisabled={disabled}
            isFullWidth
            data-testid={`${propName}-catalog-selector-toggle`}
          >
            {getRuntimeIcon(value)}
            <span className="runtime-selector pf-v6-u-m-sm">{value}</span>
          </MenuToggle>
        }
        toggleRef={toggleRef}
        popperProps={{
          minWidth: 'trigger',
          width: 'max-content',
        }}
      />
    </FieldWrapper>
  );
};

const INTEGRATION_RUNTIMES = ['Main', 'Quarkus', 'Spring Boot'];
export const RuntimeCatalogNameField: FunctionComponent<FieldProps> = (props) => (
  <CatalogSelectorField schemaType={SourceSchemaType.Route} validRuntimes={INTEGRATION_RUNTIMES} {...props} />
);

const TESTING_RUNTIMES = ['Citrus'];
export const TestingCatalogNameField: FunctionComponent<FieldProps> = (props) => (
  <CatalogSelectorField schemaType={SourceSchemaType.Test} validRuntimes={TESTING_RUNTIMES} {...props} />
);
