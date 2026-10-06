import { Dropdown, DropdownItem, DropdownList, handleArrows, MenuToggle, Tooltip } from '@patternfly/react-core';
import { FunctionComponent, KeyboardEvent, ReactNode, SyntheticEvent, useRef, useState } from 'react';

import { OverlayInteraction as InteractionData } from './overlay-entries';

interface Props {
  interaction: InteractionData;
  children: ReactNode;
  className: string;
  onAction?: (actionId: string) => void;
}

const stopPropagation = (event: SyntheticEvent) => {
  event.stopPropagation();
};

/** Presentation-only boundary. Production dispatch must additionally validate scope/owner/layer. */
export const OverlayInteraction: FunctionComponent<Props> = ({ interaction, children, className, onAction }) => {
  const [isOpen, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actions = interaction.contextMenu ?? [];
  const hasMenu = actions.length > 0;

  const onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    if (!hasMenu) return;
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      setOpen(true);
    } else if (isOpen && (event.key === 'Escape' || event.key === 'Tab')) {
      // Restore the logical tab origin before the browser performs its default Tab move.
      if (event.key === 'Escape') event.preventDefault();
      toggleRef.current?.focus();
      setOpen(false);
    } else if (isOpen && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not(:disabled)') ?? [],
      );
      // PF's window listener cannot receive stopped canvas events; use its same navigation helper locally.
      if (event.target === toggleRef.current) {
        event.preventDefault();
        (event.key === 'ArrowDown' ? items[0] : items.at(-1))?.focus();
      } else {
        handleArrows(event.nativeEvent, items);
      }
    }
  };

  const toggle = hasMenu ? (
    <MenuToggle
      ref={toggleRef}
      variant="plain"
      className={className}
      aria-label={interaction.accessibleLabel}
      isExpanded={isOpen}
      onClick={() => {
        setOpen(!isOpen);
      }}
    >
      {children}
    </MenuToggle>
  ) : (
    <span
      className={className}
      aria-label={interaction.accessibleLabel}
      role="img"
      tabIndex={interaction.tooltip ? 0 : undefined}
    >
      {children}
    </span>
  );
  const trigger = interaction.tooltip ? (
    <Tooltip content={interaction.tooltip} appendTo={() => document.body} entryDelay={0} exitDelay={0}>
      {toggle}
    </Tooltip>
  ) : (
    toggle
  );

  return (
    <span
      className="kaoto-overlay__interaction"
      onClick={stopPropagation}
      onDoubleClick={stopPropagation}
      onPointerDown={stopPropagation}
      onPointerUp={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onKeyDown={onKeyDown}
      onKeyUp={stopPropagation}
      onContextMenu={(event) => {
        event.stopPropagation();
        if (hasMenu) {
          event.preventDefault();
          setOpen(true);
        }
      }}
    >
      {hasMenu ? (
        <Dropdown
          ref={menuRef}
          isOpen={isOpen}
          onOpenChange={setOpen}
          shouldFocusFirstItemOnOpen
          toggle={{ toggleNode: trigger, toggleRef }}
          popperProps={{ appendTo: () => document.body }}
          onSelect={(_event, actionId: string) => {
            if (actions.some((action) => action.id === actionId && action.enabled)) onAction?.(actionId);
            setOpen(false);
            toggleRef.current?.focus();
          }}
        >
          <DropdownList>
            {actions.map((action) => (
              <DropdownItem key={action.id} value={action.id} isDisabled={!action.enabled || !onAction}>
                {action.label}
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
      ) : (
        trigger
      )}
    </span>
  );
};
