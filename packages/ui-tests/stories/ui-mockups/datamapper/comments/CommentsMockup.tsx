import '../choice/ConditionalMappingView.scss';

import { DocumentComment } from '@carbon/icons-react';
import { BaseNode, Types } from '@kaoto/kaoto/testing';
import {
  ActionListGroup,
  ActionListItem,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { EllipsisVIcon, PencilAltIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CommentsModal } from './CommentsModal';

export const CommentsMockup: FunctionComponent = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState<string>('');

  const onToggleMenu = useCallback(
    (event: MouseEvent | undefined) => {
      event?.stopPropagation();
      setIsMenuOpen(!isMenuOpen);
    },
    [isMenuOpen],
  );

  const onSelectAction = useCallback((event: MouseEvent | undefined, value: string | number | undefined) => {
    event?.stopPropagation();
    if (value === 'create-comment') {
      setIsModalOpen(true);
    }
    setIsMenuOpen(false);
  }, []);

  const handleCreateComment = useCallback((newComment: string) => {
    setComment(newComment);
    setIsModalOpen(false);
    console.log('Comment created:', newComment);
  }, []);

  const handleDeleteComment = useCallback(() => {
    setComment('');
    setIsModalOpen(false);
    console.log('Comment deleted');
  }, []);

  const handleUpdateComment = useCallback((newComment: string) => {
    setComment(newComment);
    setIsModalOpen(false);
    console.log('Comment updated:', newComment);
  }, []);

  const handleCancelComment = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['source-root', 'source-choice', 'source-address', 'target-root', 'target-email']),
  );
  interface MappingLine {
    sourceId: string;
    targetId: string;
    color?: string;
  }

  const mappingLines: MappingLine[] = useMemo(
    () => [{ sourceId: 'source-email', targetId: 'target-email', color: '#06c' }],
    [],
  );
  const [nodeRefs, setNodeRefs] = useState<Record<string, DOMRect>>({});

  useEffect(() => {
    const updatePositions = () => {
      const refs: Record<string, DOMRect> = {};
      for (const line of mappingLines) {
        const sourceEl = document.getElementById(line.sourceId);
        const targetEl = document.getElementById(line.targetId);
        if (sourceEl) refs[line.sourceId] = sourceEl.getBoundingClientRect();
        if (targetEl) refs[line.targetId] = targetEl.getBoundingClientRect();
      }
      setNodeRefs(refs);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [expandedNodes, mappingLines]);

  const containerRef = useRef<HTMLDivElement>(null);

  const containerRect = containerRef.current?.getBoundingClientRect();

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  return (
    <div ref={containerRef} className="conditional-mapping-view">
      <div className="conditional-mapping-view__panels">
        <div className="conditional-mapping-view__source">
          <h3>Source</h3>
          <div className="node__container">
            <div className="node__header">
              <BaseNode
                isExpandable
                isExpanded={expandedNodes.has('source-root')}
                onExpandChange={() => toggleNode('source-root')}
                isDraggable={false}
                iconType={Types.Container}
                title={
                  <span className="node__spacer" id="source-root">
                    customer
                  </span>
                }
                rank={0}
              />
            </div>
            {expandedNodes.has('source-root') && (
              <div className="node__children">
                <div className="choice-node" style={{ '--node-rank': 1 } as React.CSSProperties}>
                  {expandedNodes.has('source-choice') && (
                    <div className="node__children">
                      {/* email */}
                      <div className="node__container" style={{ marginLeft: 'calc(2 * 0.85rem)' }}>
                        <div className="node__header" id="source-email">
                          <BaseNode
                            isExpandable={false}
                            isDraggable={false}
                            iconType={Types.String}
                            title={<span className="node__spacer">email</span>}
                            rank={2}
                          />
                        </div>
                      </div>

                      {/* phone */}
                      <div className="node__container" style={{ marginLeft: 'calc(2 * 0.85rem)' }}>
                        <div className="node__header" id="source-phone">
                          <BaseNode
                            isExpandable={false}
                            isDraggable={false}
                            iconType={Types.String}
                            title={<span className="node__spacer">phone</span>}
                            rank={2}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="conditional-mapping-view__target">
          <h3>Target</h3>
          <div className="node__container">
            <div className="node__header">
              <BaseNode
                isExpandable
                isExpanded={expandedNodes.has('target-root')}
                onExpandChange={() => toggleNode('target-root')}
                isDraggable={false}
                iconType={Types.Container}
                title={
                  <span className="node__spacer" id="target-root">
                    output
                  </span>
                }
                rank={0}
              />
            </div>

            {expandedNodes.has('target-root') && (
              <div className="node__children">
                {/* email node */}
                <div className="node__container" style={{ marginLeft: 'calc(1 * 0.85rem)' }}>
                  <div className="node__header">
                    <div style={{ display: 'flex', alignItems: 'center', height: '2rem' }} id="target-email">
                      <BaseNode
                        isExpandable={false}
                        isDraggable={false}
                        title={
                          <span
                            className="node__spacer"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            email
                            <TextInput
                              value="/customer/email"
                              aria-label="XPath test expression"
                              style={{ marginLeft: '0.5rem', width: '150px', height: '1.75rem' }}
                            />
                          </span>
                        }
                        rank={2}
                      />
                      <span className="node__spacer" style={{ flex: 1 }} />
                      <ActionListGroup className="node__target__actions">
                        <ActionListItem>
                          <Tooltip content="Edit XPath">
                            <Button variant="plain" icon={<PencilAltIcon />} />
                          </Tooltip>
                        </ActionListItem>
                        {comment && (
                          <ActionListItem>
                            <Tooltip content={'Comment : ' + (comment ? comment : 'No comment')}>
                              <Button variant="plain" icon={<DocumentComment />} onClick={() => setIsModalOpen(true)} />
                            </Tooltip>
                          </ActionListItem>
                        )}
                        <ActionListItem>
                          <Dropdown
                            onSelect={onSelectAction}
                            toggle={(toggleRef: Ref<MenuToggleElement>) => (
                              <MenuToggle
                                icon={<EllipsisVIcon />}
                                ref={toggleRef}
                                onClick={onToggleMenu}
                                variant="plain"
                                isExpanded={isMenuOpen}
                                aria-label="Target element actions"
                                data-testid="target-actions-menu-toggle"
                              />
                            )}
                            isOpen={isMenuOpen}
                            onOpenChange={(isOpen: boolean) => setIsMenuOpen(isOpen)}
                          >
                            <DropdownList>
                              <DropdownItem>Add selector expression</DropdownItem>
                              <DropdownItem>Wrap with &quot;if&quot;</DropdownItem>
                              <DropdownItem>Wrap with &quot;choose-when-otherwise&quot;</DropdownItem>
                              <DropdownItem
                                key="create-comment"
                                value="create-comment"
                                data-testid="create-comment-action"
                              >
                                {comment ? 'Edit comment' : 'Add comment'}
                              </DropdownItem>
                            </DropdownList>
                          </Dropdown>
                        </ActionListItem>
                        <ActionListItem>
                          <Tooltip content="Delete">
                            <Button variant="plain" icon={<TrashIcon />} />
                          </Tooltip>
                        </ActionListItem>
                      </ActionListGroup>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mapping Lines SVG */}
        {containerRect && (
          <svg className="conditional-mapping-view__lines" data-testid="mapping-lines">
            {mappingLines.map((line) => {
              const sourceRect = nodeRefs[line.sourceId];
              const targetRect = nodeRefs[line.targetId];

              if (!sourceRect || !targetRect) return null;

              const x1 = sourceRect.right - containerRect.left;
              const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top;
              const x2 = targetRect.left - containerRect.left;
              const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;

              return (
                <line
                  key={`${line.sourceId}-${line.targetId}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={line.color || '#0066cc'}
                  strokeWidth="2"
                  opacity="0.6"
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={isModalOpen}
        initialComment={comment}
        onCreateComment={handleCreateComment}
        onCancel={handleCancelComment}
        onDeleteComment={handleDeleteComment}
        onUpdateComment={handleUpdateComment}
      />
    </div>
  );
};
