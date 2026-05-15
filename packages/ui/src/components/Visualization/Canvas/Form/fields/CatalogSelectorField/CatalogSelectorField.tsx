import './CatalogSelectorField.scss';

import { CatalogLibraryEntry } from '@kaoto/camel-catalog/types';
import { FieldProps, FieldWrapper, SchemaContext, useFieldValue } from '@kaoto/forms';
import { Menu, MenuContainer, MenuContent, MenuGroup, MenuItem, MenuToggle } from '@patternfly/react-core';
import { FunctionComponent, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { useRuntimeContext } from '../../../../../../hooks/useRuntimeContext/useRuntimeContext';
import { CAMEL_RUNTIMES, TEST_RUNTIMES } from '../../../../../../models/catalog-runtime-types';
import { CatalogVersion } from '../../../../../../models/settings/settings.model';
import { getRuntimeIcon } from '../../../../../Icons/RuntimeIcon';

export const CatalogSelectorField: FunctionComponent<FieldProps> = ({ propName, required }) => {
  const { schema } = useContext(SchemaContext);
  const { value, onChange, disabled } = useFieldValue<CatalogVersion | undefined>(propName);
  const runtimeContext = useRuntimeContext();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Determine catalog type from the bound settings property, not the display title
  const isTest = propName === 'citrusCatalog' || propName.toLowerCase().includes('citrus');
  const runtimeFilter = (isTest ? TEST_RUNTIMES : CAMEL_RUNTIMES) as readonly string[];
  const placeholder = isTest ? 'Select a Citrus catalog...' : 'Select a Camel catalog...';

  // Get available catalogs filtered by runtime
  const catalogOptions = useMemo(() => {
    return (runtimeContext.catalogLibrary?.definitions || []).filter((catalog) =>
      runtimeFilter.includes(catalog.runtime),
    );
  }, [runtimeContext.catalogLibrary, runtimeFilter]);

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

  // Find the display name for the current value
  const displayName = useMemo(() => {
    if (!value) return placeholder;

    // If version is empty, find the default catalog for this runtime
    if (value.version === '') {
      const defaultCatalog = catalogOptions.find((c) => c.runtime === value.runtime);
      return defaultCatalog ? defaultCatalog.name : placeholder;
    }

    const matchingCatalog = catalogOptions.find((c) => c.version === value.version && c.runtime === value.runtime);
    return matchingCatalog?.name || `${value.runtime} ${value.version}`;
  }, [value, catalogOptions, placeholder]);

  const onSelect = useCallback(
    (_event: unknown, catalogName: string | number | undefined) => {
      if (!catalogName) return;

      const selectedCatalog = catalogOptions.find((c) => c.name === catalogName);
      if (selectedCatalog) {
        onChange({
          version: selectedCatalog.version,
          runtime: selectedCatalog.runtime,
        });
      }
      setIsOpen(false);
    },
    [catalogOptions, onChange],
  );

  // Handle loading state
  if (!runtimeContext.catalogLibrary) {
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
      type="object"
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
                      isSelected={value?.version === catalog.version && value?.runtime === catalog.runtime}
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
          >
            {value && value.version !== '' && getRuntimeIcon(value.runtime)}
            <span className="runtime-selector pf-v6-u-m-sm">{displayName}</span>
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
