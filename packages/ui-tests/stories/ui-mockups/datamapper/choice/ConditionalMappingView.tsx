import './ConditionalMappingView.scss';

import { ChevronDown, ChevronRight, Choices } from '@carbon/icons-react';
import { BaseNode } from '@kaoto/kaoto/testing';
import { Types } from '@kaoto/kaoto/testing';
import { ActionListGroup, ActionListItem, Button, Icon, Label, TextInput, Tooltip } from '@patternfly/react-core';
import { EllipsisVIcon, PencilAltIcon, TimesIcon } from '@patternfly/react-icons';
import { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react';

interface MappingLine {
  sourceId: string;
  targetId: string;
  color?: string;
}

interface ConditionalMappingViewProps {
  'data-testid'?: string;
}

const formatChoiceMembers = (members: string[], maxDisplay: number = 3): string => {
  if (members.length <= maxDisplay) {
    return members.join(' | ');
  }
  const displayed = members.slice(0, maxDisplay).join(' | ');
  const remaining = members.length - maxDisplay;
  return `${displayed} ... +${remaining} more`;
};

export const ConditionalMappingView: FunctionComponent<ConditionalMappingViewProps> = ({
  'data-testid': dataTestId = 'conditional-mapping',
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['source-root', 'source-choice', 'source-address', 'target-root', 'target-choose']),
  );
  const [nodeRefs, setNodeRefs] = useState<Record<string, DOMRect>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const choiceMembers = ['email', 'phone', 'address'];
  const formattedChoiceMembers = formatChoiceMembers(choiceMembers);

  const mappingLines: MappingLine[] = useMemo(
    () => [
      { sourceId: 'source-email', targetId: 'target-when-email', color: '#06c' },
      { sourceId: 'source-phone', targetId: 'target-when-phone', color: '#06c' },
      { sourceId: 'source-address', targetId: 'target-when-address', color: '#06c' },
    ],
    [],
  );

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

  const containerRect = containerRef.current?.getBoundingClientRect();

  return (
    <div ref={containerRef} className="conditional-mapping-view" data-testid={dataTestId}>
      <div className="conditional-mapping-view__panels">
        {/* Source Panel */}
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
                  <div className="choice-node__header" id="source-choice">
                    <Icon
                      className="choice-node__expand"
                      style={{ cursor: 'pointer' }}
                      onClick={() => toggleNode('source-choice')}
                    >
                      {expandedNodes.has('source-choice') ? <ChevronDown /> : <ChevronRight />}
                    </Icon>
                    <span className="choice-node__title">
                      <Label isCompact variant="outline">
                        choice
                      </Label>{' '}
                      <span style={{ fontStyle: 'italic' }}>({formattedChoiceMembers})</span>
                    </span>
                    <Icon className="node__spacer">
                      <Choices />
                    </Icon>
                  </div>
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

                      {/* address */}
                      <div className="node__container" style={{ marginLeft: 'calc(2 * 0.85rem)' }}>
                        <div className="node__header" id="source-address">
                          <BaseNode
                            isExpandable
                            isExpanded={expandedNodes.has('source-address')}
                            onExpandChange={() => toggleNode('source-address')}
                            isDraggable={false}
                            iconType={Types.Container}
                            title={<span className="node__spacer">address</span>}
                            rank={2}
                          />
                        </div>
                        {expandedNodes.has('source-address') && (
                          <div className="node__children">
                            {/* street */}
                            <div className="node__container" style={{ marginLeft: 'calc(3 * 0.85rem)' }}>
                              <div className="node__header">
                                <BaseNode
                                  isExpandable={false}
                                  isDraggable={false}
                                  iconType={Types.String}
                                  title={
                                    <span className="node__spacer" id="source-street">
                                      street
                                    </span>
                                  }
                                  rank={3}
                                />
                              </div>
                            </div>

                            {/* city */}
                            <div className="node__container" style={{ marginLeft: 'calc(3 * 0.85rem)' }}>
                              <div className="node__header">
                                <BaseNode
                                  isExpandable={false}
                                  isDraggable={false}
                                  iconType={Types.String}
                                  title={
                                    <span className="node__spacer" id="source-city">
                                      city
                                    </span>
                                  }
                                  rank={3}
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
            )}
          </div>
        </div>

        {/* Target Panel */}
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
                {/* choose node */}
                <div className="node__container" style={{ marginLeft: 'calc(1 * 0.85rem)' }}>
                  <div className="node__header">
                    <div
                      className="node__row"
                      style={{ display: 'flex', alignItems: 'center', height: '2rem' }}
                      id="target-choose"
                    >
                      <Icon
                        className="node__spacer"
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleNode('target-choose')}
                      >
                        {expandedNodes.has('target-choose') ? <ChevronDown /> : <ChevronRight />}
                      </Icon>
                      <Label isCompact color="grey">
                        choose
                      </Label>
                      <span className="node__spacer" style={{ flex: 1 }} />
                      <ActionListGroup className="node__target__actions">
                        <ActionListItem>
                          <Tooltip content="Condition menu">
                            <Button variant="plain" icon={<EllipsisVIcon />} />
                          </Tooltip>
                        </ActionListItem>
                        <ActionListItem>
                          <Tooltip content="Delete">
                            <Button variant="plain" icon={<TimesIcon />} />
                          </Tooltip>
                        </ActionListItem>
                      </ActionListGroup>
                    </div>
                  </div>

                  {expandedNodes.has('target-choose') && (
                    <div className="node__children">
                      {/* when email */}
                      <WhenNode
                        id="target-when-email"
                        test="email"
                        rank={2}
                        fields={[
                          { id: 'target-email-value', name: 'contactValue', type: Types.String },
                          { id: 'target-email-type', name: 'contactType', type: Types.String },
                        ]}
                      />

                      {/* when phone */}
                      <WhenNode
                        id="target-when-phone"
                        test="phone"
                        rank={2}
                        fields={[
                          { id: 'target-phone-value', name: 'contactValue', type: Types.String },
                          { id: 'target-phone-type', name: 'contactType', type: Types.String },
                        ]}
                      />

                      {/* when address */}
                      <WhenNode
                        id="target-when-address"
                        test="address"
                        rank={2}
                        fields={[
                          { id: 'target-address-value', name: 'contactValue', type: Types.String },
                          { id: 'target-address-type', name: 'contactType', type: Types.String },
                        ]}
                      />

                      {/* otherwise */}
                      <OtherwiseNode
                        id="target-otherwise"
                        rank={2}
                        fields={[
                          { id: 'target-otherwise-value', name: 'contactValue', type: Types.String },
                          { id: 'target-otherwise-type', name: 'contactType', type: Types.String },
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
  );
};

interface WhenNodeProps {
  id: string;
  test: string;
  rank: number;
  fields: Array<{ id: string; name: string; type: Types }>;
}

const WhenNode: FunctionComponent<WhenNodeProps> = ({ id, test, rank, fields }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="node__container" style={{ marginLeft: `calc(${rank} * 0.85rem)` }}>
      <div className="node__header">
        <div className="node__row" style={{ display: 'flex', alignItems: 'center', height: '2rem' }} id={id}>
          <Icon className="node__spacer" style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </Icon>
          <Label isCompact color="grey">
            when
          </Label>
          <TextInput
            value={test}
            aria-label="XPath test expression"
            style={{ marginLeft: '0.5rem', width: '150px', height: '1.75rem' }}
          />
          <span className="node__spacer" style={{ flex: 1 }} />
          <ActionListGroup className="node__target__actions">
            <ActionListItem>
              <Tooltip content="Edit XPath">
                <Button variant="plain" icon={<PencilAltIcon />} />
              </Tooltip>
            </ActionListItem>
            <ActionListItem>
              <Tooltip content="Condition menu">
                <Button variant="plain" icon={<EllipsisVIcon />} />
              </Tooltip>
            </ActionListItem>
            <ActionListItem>
              <Tooltip content="Delete">
                <Button variant="plain" icon={<TimesIcon />} />
              </Tooltip>
            </ActionListItem>
          </ActionListGroup>
        </div>
      </div>

      {isExpanded && (
        <div className="node__children">
          {fields.map((child) => (
            <div key={child.id} className="node__container">
              <div className="node__header">
                <BaseNode
                  isExpandable={false}
                  isDraggable={false}
                  iconType={child.type}
                  title={
                    <span className="node__spacer" id={child.id}>
                      {child.name}
                    </span>
                  }
                  rank={rank + 1}
                >
                  <ActionListGroup className="node__target__actions" />
                </BaseNode>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface OtherwiseNodeProps {
  id: string;
  rank: number;
  fields: Array<{ id: string; name: string; type: Types }>;
}

const OtherwiseNode: FunctionComponent<OtherwiseNodeProps> = ({ id, rank, fields }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="node__container" style={{ marginLeft: `calc(${rank} * 0.85rem)` }}>
      <div className="node__header">
        <div className="node__row" style={{ display: 'flex', alignItems: 'center', height: '2rem' }} id={id}>
          <Icon className="node__spacer" style={{ cursor: 'pointer' }} onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </Icon>
          <Label isCompact color="grey">
            otherwise
          </Label>
          <span className="node__spacer" style={{ flex: 1 }} />
          <ActionListGroup className="node__target__actions">
            <ActionListItem>
              <Tooltip content="Condition menu">
                <Button variant="plain" icon={<EllipsisVIcon />} />
              </Tooltip>
            </ActionListItem>
            <ActionListItem>
              <Tooltip content="Delete">
                <Button variant="plain" icon={<TimesIcon />} />
              </Tooltip>
            </ActionListItem>
          </ActionListGroup>
        </div>
      </div>

      {isExpanded && (
        <div className="node__children">
          {fields.map((child) => (
            <div key={child.id} className="node__container">
              <div className="node__header">
                <BaseNode
                  isExpandable={false}
                  isDraggable={false}
                  iconType={child.type}
                  title={
                    <span className="node__spacer" id={child.id}>
                      {child.name}
                    </span>
                  }
                  rank={rank + 1}
                >
                  <ActionListGroup className="node__target__actions" />
                </BaseNode>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
