import { Icon, Menu, MenuContainer, MenuContent, MenuItem, MenuList, MenuToggle } from '@patternfly/react-core';
import { FunctionComponent, ReactElement, useCallback, useRef, useState } from 'react';
import camelLogo from '../../../../assets/camel-logo.svg';
import quarkusLogo from '../../../../assets/quarkus-logo.svg';
import redhatLogo from '../../../../assets/redhat-logo.svg';
import springBootLogo from '../../../../assets/springboot-logo.svg';
import { useLocalStorage } from '../../../../hooks';
import { useRuntimeContext } from '../../../../hooks/useRuntimeContext/useRuntimeContext';
import { LocalStorageKeys } from '../../../../models';

const SPACE_REGEX = /\s/g;
const getIcon = (name: string) => {
  if (name.includes('redhat')) {
    return (
      <Icon>
        <img src={redhatLogo} />
      </Icon>
    );
  } else if (name.includes('Quarkus')) {
    return (
      <Icon>
        <img src={quarkusLogo} />
      </Icon>
    );
  } else if (name.replace(SPACE_REGEX, '').includes('SpringBoot')) {
    return (
      <Icon>
        <img src={springBootLogo} />
      </Icon>
    );
  } else {
    return (
      <Icon>
        <img src={camelLogo} />
      </Icon>
    );
  }
};

export const RuntimeSelector: FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const runtimeContext = useRuntimeContext();
  const [_, setSelectedCatalogLocalStorage] = useLocalStorage(
    LocalStorageKeys.SelectedCatalog,
    runtimeContext.selectedCatalog,
  );
  const groupedRuntimes =
    runtimeContext.catalogLibrary?.definitions.reduce(
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

      if (!selectedCatalog) {
        return;
      }

      runtimeContext.setSelectedCatalog(selectedCatalog);
      setSelectedCatalogLocalStorage(selectedCatalog);
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
            <span className="pf-v5-u-text-break-word" style={{ wordBreak: 'keep-all' }}>
              {runtime.description}
            </span>
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
        // TODO: Workaround for flyout menu being scrollable and packed within the toolbar
        <Menu ref={menuRef} style={{ overflowY: 'unset' }} containsFlyout onSelect={onSelect}>
          <MenuContent>
            <MenuList>
              {Object.entries(groupedRuntimes).map(([group, runtimes]) => {
                const flyoutMenu = (
                  <Menu onSelect={onSelect}>
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
          <span className="pf-v5-u-m-sm">{runtimeContext.selectedCatalog?.name}</span>
        </MenuToggle>
      }
      toggleRef={toggleRef}
    />
  );
};
