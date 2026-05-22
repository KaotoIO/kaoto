import './AbstractTreeMock.scss';

import { ChevronDown, ChevronRight, Choices } from '@carbon/icons-react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  Label,
  Menu,
  MenuContent,
  MenuItem,
  MenuList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { EllipsisVIcon, LayerGroupIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, ReactNode, Ref, useCallback, useEffect, useState } from 'react';

export interface DocMenuItem {
  key: string;
  label: string;
  onClick: () => void;
}

export interface MappingMenuItem {
  key: string;
  label: string;
  onClick: () => void;
}

interface FieldRowProps {
  rank: number;
  name: string;
  typeOrCandidates: string;
  isAbstract?: boolean;
  isCollection?: boolean;
  showChoicesIcon?: boolean;
  expandable?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  docMenuItems?: DocMenuItem[];
  mappingMenuItems?: MappingMenuItem[];
  children?: ReactNode;
  'data-testid'?: string;
}

export const FieldRow: FunctionComponent<FieldRowProps> = ({
  rank,
  name,
  typeOrCandidates,
  isAbstract,
  isCollection,
  showChoicesIcon = true,
  expandable,
  isExpanded,
  onToggle,
  onRemove,
  docMenuItems,
  mappingMenuItems,
  children,
  'data-testid': dataTestId,
}) => {
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  const [docMenuPos, setDocMenuPos] = useState({ x: 0, y: 0 });
  const [mappingMenuOpen, setMappingMenuOpen] = useState(false);

  useEffect(() => {
    if (!docMenuOpen) return;
    const close = () => setDocMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [docMenuOpen]);

  const handleContextMenu = useCallback(
    (e: MouseEvent) => {
      if (!docMenuItems || docMenuItems.length === 0) return;
      e.preventDefault();
      e.stopPropagation();
      setDocMenuPos({ x: e.clientX, y: e.clientY });
      setDocMenuOpen(true);
    },
    [docMenuItems],
  );

  const handleToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onToggle?.();
    },
    [onToggle],
  );

  const renderMappingToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle
        ref={toggleRef}
        onClick={(e) => {
          e.stopPropagation();
          setMappingMenuOpen((prev) => !prev);
        }}
        variant="plain"
        isExpanded={mappingMenuOpen}
        aria-label="Mapping actions"
      >
        <EllipsisVIcon />
      </MenuToggle>
    ),
    [mappingMenuOpen],
  );

  const sectionClassName = isAbstract
    ? 'abstract-tree__field-node abstract-tree__field-node--pending'
    : 'abstract-tree__field-node';

  return (
    <>
      <div className="node__container" data-testid={dataTestId}>
        <section
          className={sectionClassName}
          style={{ '--node-rank': rank } as React.CSSProperties}
          onContextMenu={handleContextMenu}
        >
          {expandable ? (
            <Icon className="abstract-tree__field-expand" onClick={handleToggle}>
              {isExpanded ? <ChevronDown /> : <ChevronRight />}
            </Icon>
          ) : (
            <span className="abstract-tree__field-expand-placeholder" />
          )}
          {isAbstract && (
            <Label isCompact variant="outline">
              abstract
            </Label>
          )}
          <span className="abstract-tree__field-name">{name}</span>
          <span className={isAbstract ? 'abstract-tree__abstract-candidates' : 'abstract-tree__field-type'}>
            {typeOrCandidates}
          </span>
          {isCollection && (
            <Icon>
              <LayerGroupIcon />
            </Icon>
          )}
          {showChoicesIcon && (
            <Icon>
              <Choices />
            </Icon>
          )}
          {(onRemove || (mappingMenuItems && mappingMenuItems.length > 0)) && (
            <div className="abstract-tree__mapping-actions">
              {mappingMenuItems && mappingMenuItems.length > 0 && (
                <Dropdown
                  onSelect={(e) => {
                    e?.stopPropagation();
                    setMappingMenuOpen(false);
                  }}
                  toggle={renderMappingToggle}
                  isOpen={mappingMenuOpen}
                  onOpenChange={setMappingMenuOpen}
                  popperProps={{ position: 'end' }}
                >
                  <DropdownList>
                    {mappingMenuItems.map((item) => (
                      <DropdownItem key={item.key} onClick={item.onClick}>
                        {item.label}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                </Dropdown>
              )}
              {onRemove && (
                <Button variant="plain" icon={<TrashIcon />} size="sm" onClick={onRemove} aria-label="Delete" />
              )}
            </div>
          )}
        </section>
        {expandable && isExpanded && children && <div className="node__children">{children}</div>}
      </div>
      {docMenuOpen && docMenuItems && docMenuItems.length > 0 && (
        <div
          className="abstract-tree__right-click-menu"
          style={{ position: 'fixed', left: docMenuPos.x, top: docMenuPos.y, zIndex: 9999 }}
        >
          <Menu>
            <MenuContent>
              <MenuList>
                {docMenuItems.map((item) => (
                  <MenuItem
                    key={item.key}
                    onClick={() => {
                      item.onClick();
                      setDocMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
              </MenuList>
            </MenuContent>
          </Menu>
        </div>
      )}
    </>
  );
};
