import './ChoiceTreeMock.scss';

import { Choices } from '@carbon/icons-react';
import { BaseNode } from '@kaoto/kaoto/testing';
import { Icon, Menu, MenuContent, MenuItem, MenuList, Tooltip } from '@patternfly/react-core';
import { FunctionComponent, MouseEvent, useCallback, useEffect, useRef, useState } from 'react';

import { ChoiceNode } from './ChoiceNode';
import { isChoiceNode, MockFieldNode, MockTreeNode } from './mockSchemaData';

interface ChoiceTreeMockProps {
  treeNode: MockTreeNode;
  rank?: number;
  selections: Record<string, string>;
  onOpenDialog: (choiceId: string) => void;
  onRevertChoice?: (choiceId: string) => void;
  selectedFromChoice?: { choiceId: string; choiceTitle: string; isCollection: boolean };
  'data-testid'?: string;
}

export const ChoiceTreeMock: FunctionComponent<ChoiceTreeMockProps> = ({
  treeNode,
  rank = 0,
  selections,
  onOpenDialog,
  onRevertChoice,
  selectedFromChoice,
  'data-testid': dataTestId,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    const collectInitiallyExpanded = (node: MockTreeNode) => {
      if (isChoiceNode(node) && node.isExpanded) {
        initialExpanded.add(node.id);
      }
      if (!isChoiceNode(node) && node.children) {
        for (const child of node.children) {
          collectInitiallyExpanded(child);
        }
      }
      if (isChoiceNode(node)) {
        for (const member of node.members) {
          collectInitiallyExpanded(member);
        }
      }
    };
    collectInitiallyExpanded(treeNode);
    return initialExpanded;
  });

  const toggleExpansion = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (!selectedFromChoice || !onRevertChoice) return;
      event.preventDefault();
      event.stopPropagation();
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setIsContextMenuOpen(true);
    },
    [selectedFromChoice, onRevertChoice],
  );

  const handleRevertChoice = useCallback(() => {
    if (selectedFromChoice && onRevertChoice) {
      onRevertChoice(selectedFromChoice.choiceId);
    }
    setIsContextMenuOpen(false);
  }, [selectedFromChoice, onRevertChoice]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setIsContextMenuOpen(false);
      }
    };

    if (isContextMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isContextMenuOpen]);

  if (isChoiceNode(treeNode)) {
    const selectedMemberId = selections[treeNode.id];

    if (selectedMemberId) {
      const selectedMember = treeNode.members.find((member) => member.id === selectedMemberId);
      if (selectedMember) {
        const memberNames = treeNode.members.map((m) => (isChoiceNode(m) ? m.title : m.displayName)).join(' | ');
        const isCollection = treeNode.maxOccurs === -1 || treeNode.maxOccurs > 1;
        return (
          <ChoiceTreeMock
            treeNode={selectedMember}
            rank={rank}
            selections={selections}
            onOpenDialog={onOpenDialog}
            onRevertChoice={onRevertChoice}
            selectedFromChoice={{
              choiceId: treeNode.id,
              choiceTitle: `choice (${memberNames})`,
              isCollection,
            }}
            data-testid={dataTestId}
          />
        );
      }
    }

    const hasSelection = selectedMemberId !== undefined;
    const isExpanded = expandedNodes.has(treeNode.id);

    const handleToggleExpand = (event: MouseEvent) => {
      event.stopPropagation();
      toggleExpansion(treeNode.id);
    };

    return (
      <div className="node__container" data-testid={dataTestId || `choice-${treeNode.id}`}>
        <ChoiceNode
          choiceNode={treeNode}
          rank={rank}
          onSelectOption={onOpenDialog}
          onChangeSelection={onOpenDialog}
          onRevertChoice={onRevertChoice}
          hasSelection={hasSelection}
          isExpanded={isExpanded}
          onToggleExpand={handleToggleExpand}
          selectedFromChoice={selectedFromChoice}
          data-testid={`choice-node-${treeNode.id}`}
        />
        {!hasSelection && isExpanded && (
          <div className="node__children">
            {treeNode.members.map((member) => (
              <ChoiceTreeMock
                key={member.id}
                treeNode={member}
                rank={rank + 1}
                selections={selections}
                onOpenDialog={onOpenDialog}
                onRevertChoice={onRevertChoice}
                data-testid={`member-${member.id}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const fieldNode = treeNode as MockFieldNode;
  const hasChildren = fieldNode.children && fieldNode.children.length > 0;
  const isExpanded = expandedNodes.has(fieldNode.id) || (hasChildren && rank === 0);

  const handleClickToggle = (event: MouseEvent) => {
    event.stopPropagation();
    if (!hasChildren) return;
    toggleExpansion(fieldNode.id);
  };

  const titleContent = selectedFromChoice ? (
    <span className="node__spacer" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      {fieldNode.displayName}
      <Tooltip content={`Selected from ${selectedFromChoice.choiceTitle}`}>
        <Icon style={{ fontSize: '0.875rem', color: 'var(--pf-v6-global--palette--purple-500)' }}>
          <Choices />
        </Icon>
      </Tooltip>
    </span>
  ) : (
    <span className="node__spacer">{fieldNode.displayName}</span>
  );

  return (
    <>
      <div
        className="node__container"
        data-testid={dataTestId || `node-${fieldNode.id}`}
        onContextMenu={handleContextMenu}
      >
        <div className="node__header">
          <BaseNode
            data-testid={fieldNode.displayName}
            isExpandable={hasChildren}
            isExpanded={isExpanded}
            onExpandChange={handleClickToggle}
            isDraggable={false}
            iconType={fieldNode.type}
            isCollectionField={selectedFromChoice?.isCollection ?? false}
            title={titleContent}
            rank={rank}
          />
        </div>

        {hasChildren && isExpanded && (
          <div className="node__children">
            {fieldNode.children?.map((child) => (
              <ChoiceTreeMock
                key={child.id}
                treeNode={child}
                rank={rank + 1}
                selections={selections}
                onOpenDialog={onOpenDialog}
                onRevertChoice={onRevertChoice}
                data-testid={`child-${child.id}`}
              />
            ))}
          </div>
        )}
      </div>
      {isContextMenuOpen && selectedFromChoice && (
        <Menu
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
            zIndex: 9999,
          }}
          data-testid={`${dataTestId}-context-menu`}
        >
          <MenuContent>
            <MenuList>
              <MenuItem onClick={handleRevertChoice} data-testid={`${dataTestId}-revert-choice`}>
                Revert to choice
              </MenuItem>
            </MenuList>
          </MenuContent>
        </Menu>
      )}
    </>
  );
};
