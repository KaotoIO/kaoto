import './ChoiceNode.scss';

import { ChevronDown, ChevronRight, Choices } from '@carbon/icons-react';
import { Icon, Label, Menu, MenuContent, MenuItem, MenuList, Tooltip } from '@patternfly/react-core';
import { LayerGroupIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getChoiceDisplayName, MockChoiceNode } from './mockSchemaData';

interface ChoiceNodeProps {
  choiceNode: MockChoiceNode;
  rank: number;
  onSelectOption: (choiceId: string) => void;
  onChangeSelection?: (choiceId: string) => void;
  onRevertChoice?: (choiceId: string) => void;
  hasSelection: boolean;
  isExpanded: boolean;
  onToggleExpand: (event: MouseEvent) => void;
  selectedFromChoice?: { choiceId: string; choiceTitle: string; isCollection: boolean };
  'data-testid'?: string;
}

export const ChoiceNode: FunctionComponent<ChoiceNodeProps> = ({
  choiceNode,
  rank,
  onSelectOption,
  onChangeSelection,
  onRevertChoice,
  hasSelection,
  isExpanded,
  onToggleExpand,
  selectedFromChoice,
  'data-testid': dataTestId = 'choice-node',
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuPosition({ x: event.clientX, y: event.clientY });
    setIsMenuOpen(true);
  }, []);

  const handleSelectOption = useCallback(() => {
    onSelectOption(choiceNode.id);
    setIsMenuOpen(false);
  }, [choiceNode.id, onSelectOption]);

  const handleChangeSelection = useCallback(() => {
    if (onChangeSelection) {
      onChangeSelection(choiceNode.id);
    }
    setIsMenuOpen(false);
  }, [choiceNode.id, onChangeSelection]);

  const handleRevertChoice = useCallback(() => {
    if (selectedFromChoice && onRevertChoice) {
      onRevertChoice(selectedFromChoice.choiceId);
    }
    setIsMenuOpen(false);
  }, [selectedFromChoice, onRevertChoice]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  const displayName = useMemo(() => getChoiceDisplayName(choiceNode), [choiceNode]);
  const memberNames = useMemo(() => displayName.replace('choice ', '').trim(), [displayName]);
  const isCollection = choiceNode.maxOccurs === -1 || choiceNode.maxOccurs > 1;

  return (
    <>
      <section
        className="choice-node"
        style={{ '--node-rank': rank } as React.CSSProperties}
        data-testid={dataTestId}
        onContextMenu={handleContextMenu}
      >
        <div className="choice-node__header">
          <Icon className="choice-node__expand" onClick={onToggleExpand} data-testid={`${dataTestId}-expand`}>
            {isExpanded && <ChevronDown />}
            {!isExpanded && <ChevronRight />}
          </Icon>
          <span className="choice-node__title" data-testid={`${dataTestId}-title`}>
            <Label isCompact variant="outline">
              choice
            </Label>{' '}
            <span style={{ fontStyle: 'italic' }}>{memberNames}</span>
          </span>
          {isCollection && (
            <Icon className="node__spacer" data-testid={`${dataTestId}-collection-icon`}>
              <LayerGroupIcon />
            </Icon>
          )}
          {selectedFromChoice ? (
            <Tooltip content={`Selected from ${selectedFromChoice.choiceTitle}`}>
              <Icon className="node__spacer" style={{ color: 'var(--pf-v6-global--palette--purple-500)' }}>
                <Choices />
              </Icon>
            </Tooltip>
          ) : (
            <Icon className="node__spacer">
              <Choices />
            </Icon>
          )}
        </div>
      </section>
      {isMenuOpen && (
        <Menu
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${menuPosition.x}px`,
            top: `${menuPosition.y}px`,
            zIndex: 9999,
          }}
          data-testid={`${dataTestId}-context-menu`}
        >
          <MenuContent>
            <MenuList>
              {!hasSelection && (
                <MenuItem onClick={handleSelectOption} data-testid={`${dataTestId}-select-option`}>
                  Select option...
                </MenuItem>
              )}
              {hasSelection && (
                <MenuItem onClick={handleChangeSelection} data-testid={`${dataTestId}-change-selection`}>
                  Change selection...
                </MenuItem>
              )}
              {selectedFromChoice && onRevertChoice && (
                <MenuItem onClick={handleRevertChoice} data-testid={`${dataTestId}-revert-choice`}>
                  Revert to choice
                </MenuItem>
              )}
            </MenuList>
          </MenuContent>
        </Menu>
      )}
    </>
  );
};
