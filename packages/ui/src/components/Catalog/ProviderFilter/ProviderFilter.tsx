import './ProviderFilter.scss';

import { Badge, Menu, MenuContent, MenuItem, MenuList, MenuToggle, Popper } from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { FunctionComponent, useCallback, useRef, useState } from 'react';

interface ProviderFilterProps {
  providers: string[];
  selectedProviders: string[];
  onSelectProvider: (provider: string) => void;
}

export const ProviderFilter: FunctionComponent<ProviderFilterProps> = ({
  providers,
  selectedProviders,
  onSelectProvider,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const onSelect = useCallback(
    (_event: unknown, itemId: string | number | undefined) => {
      if (typeof itemId === 'undefined') {
        return;
      }

      const itemStr = itemId.toString();
      onSelectProvider(itemStr);
    },
    [onSelectProvider],
  );

  const toggle = (
    <MenuToggle
      data-testid="provider-filter-toggle"
      ref={toggleRef}
      onClick={() => {
        setIsOpen(!isOpen);
      }}
      isExpanded={isOpen}
      icon={<FilterIcon />}
      {...(selectedProviders.length > 0 && { badge: <Badge isRead>{selectedProviders.length}</Badge> })}
    >
      Provided by
    </MenuToggle>
  );

  const menu = (
    <Menu ref={menuRef} id="providers-select-menu" onSelect={onSelect} selected={selectedProviders}>
      <MenuContent>
        <MenuList>
          {providers.map((provider) => (
            <MenuItem
              key={provider}
              itemId={provider}
              data-testid={`providers-select-item-${provider}`}
              hasCheckbox
              isSelected={selectedProviders.includes(provider)}
            >
              {provider}
            </MenuItem>
          ))}
        </MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <div ref={containerRef}>
      <Popper
        trigger={toggle}
        triggerRef={toggleRef}
        popper={menu}
        popperRef={menuRef}
        appendTo={containerRef.current || undefined}
        isVisible={isOpen}
      />
    </div>
  );
};
