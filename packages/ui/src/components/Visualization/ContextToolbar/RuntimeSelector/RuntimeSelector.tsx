import './RuntimeSelector.scss';

import { isDefined } from '@kaoto/forms';
import { Icon, Menu, MenuContainer, MenuContent, MenuItem, MenuList, MenuToggle } from '@patternfly/react-core';
import { FunctionComponent, ReactElement, useCallback, useContext, useRef, useState } from 'react';

import camelLogo from '../../../../assets/camel-logo.svg';
import citrusLogo from '../../../../assets/citrus-logo.png';
import quarkusLogo from '../../../../assets/quarkus-logo.svg';
import redhatLogo from '../../../../assets/redhat-logo.svg';
import springBootLogo from '../../../../assets/springboot-logo.svg';
import { useLocalStorage } from '../../../../hooks';
import { useRuntimeContext } from '../../../../hooks/useRuntimeContext/useRuntimeContext';
import { LocalStorageKeys } from '../../../../models';
import { SourceSchemaType } from '../../../../models/camel';
import { EntitiesContext } from '../../../../providers';

const SPACE_REGEX = /\s/g;
const getIcon = (name: string) => {
  if (name.includes('redhat')) {
    return (
      <Icon>
        <img src={redhatLogo} alt="Red Hat logo" />
      </Icon>
    );
  } else if (name.includes('Citrus')) {
    return (
      <Icon>
        <img src={citrusLogo} alt="Citrus logo" />
      </Icon>
    );
  } else if (name.includes('Quarkus')) {
    return (
      <Icon>
        <img src={quarkusLogo} alt="Quarkus logo" />
      </Icon>
    );
  } else if (name.replace(SPACE_REGEX, '').includes('SpringBoot')) {
    return (
      <Icon>
        <img src={springBootLogo} alt="Spring Boot logo" />
      </Icon>
    );
  } else {
    return (
      <Icon>
        <img src={camelLogo} alt="Apache Camel logo" />
      </Icon>
    );
  }
};

export const RuntimeSelector: FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const runtimeContext = useRuntimeContext();
  const entitiesContext = useContext(EntitiesContext);
  const currentSchemaType = entitiesContext?.currentSchemaType;
  const [_, setSelectedCatalogLocalStorage] = useLocalStorage(
    LocalStorageKeys.SelectedCatalog,
    runtimeContext.selectedCatalog,
  );
  const groupedRuntimes =
    runtimeContext.catalogLibrary?.definitions
      .filter((catalog) => {
        if (currentSchemaType && currentSchemaType === SourceSchemaType.Test) {
          return catalog.runtime === 'Citrus';
        } else {
          return catalog.runtime !== 'Citrus';
        }
      })
      .reduce(
        (acc, catalog) => {
          if (acc[catalog.runtime]) {
            acc[catalog.runtime].push(catalog.name);
          } else {
            acc[catalog.runtime] = [catalog.name];
          }

          return acc;
        },
        {} as Record<string, string[]>,
      ) ?? {};

  const onSelect = useCallback(
    (_event: unknown, runtimeVersion: string | number | undefined) => {
      if (!runtimeVersion) {
        return;
      }

      const selectedCatalog = runtimeContext.catalogLibrary?.definitions.find(
        (catalog) => catalog.name === runtimeVersion,
      );

      if (isDefined(selectedCatalog)) {
        runtimeContext.setSelectedCatalog(selectedCatalog);
        setSelectedCatalogLocalStorage(selectedCatalog);
      }

      setIsOpen(false);
    },
    [runtimeContext, setSelectedCatalogLocalStorage],
  );

  const getMenuItem = useCallback(
    (
      runtime:
        | string
        | { title: string; description?: string; name: string }
        | { title: string; description?: string; key: string },
      flyoutMenu?: ReactElement,
    ) => {
      if (typeof runtime === 'string') {
        const icon = getIcon(runtime);
        return (
          <MenuItem
            key={`runtime-selector-${runtime}`}
            data-testid={`runtime-selector-${runtime}`}
            icon={icon}
            itemId={runtime}
            onSelect={() => {}}
          >
            {runtime}
          </MenuItem>
        );
      }

      const name = 'name' in runtime ? runtime.name : runtime.key;
      const icon = getIcon(name);

      return (
        <MenuItem
          key={`runtime-selector-${name}`}
          data-testid={`runtime-selector-${name}`}
          icon={icon}
          itemId={name}
          description={
            <span className="pf-v6-u-text-break-word runtime-selector__description">{runtime.description}</span>
          }
          flyoutMenu={flyoutMenu}
        >
          {runtime.title}
        </MenuItem>
      );
    },
    [],
  );

  return (
    <MenuContainer
      isOpen={isOpen}
      onOpenChange={(isOpen) => setIsOpen(isOpen)}
      menu={
        <Menu ref={menuRef} containsFlyout onSelect={onSelect}>
          <MenuContent>
            <MenuList>
              {Object.entries(groupedRuntimes).map(([group, runtimes]) => {
                const flyoutMenu = (
                  <Menu className="runtime-selector__submenu" onSelect={onSelect}>
                    <MenuContent>
                      <MenuList>{runtimes.map((runtimeDef) => getMenuItem(runtimeDef))}</MenuList>
                    </MenuContent>
                  </Menu>
                );

                return getMenuItem({ key: group, title: group }, flyoutMenu);
              })}
            </MenuList>
          </MenuContent>
        </Menu>
      }
      menuRef={menuRef}
      toggle={
        <MenuToggle
          data-testid="runtime-selector-list-dropdown"
          ref={toggleRef}
          onClick={() => {
            setIsOpen(!isOpen);
          }}
          isExpanded={isOpen}
        >
          {getIcon(runtimeContext.selectedCatalog?.name as string)}
          <span className="pf-v6-u-m-sm">{runtimeContext.selectedCatalog?.name}</span>
        </MenuToggle>
      }
      toggleRef={toggleRef}
      popperProps={{
        minWidth: 'trigger',
        width: 'max-content',
      }}
    />
  );
};
