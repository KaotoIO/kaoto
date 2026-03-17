import './VariableMockup.scss';

import { Draggable } from '@carbon/icons-react';
import { BaseNode, ExpansionPanel, ExpansionPanels, Types } from '@kaoto/kaoto/testing';
import { Button, Dropdown, DropdownItem, DropdownList, Icon, Label, MenuToggle, Tooltip } from '@patternfly/react-core';
import { EllipsisVIcon, PencilAltIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, MouseEvent, Ref, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { VariableInputPlaceholder } from './VariableInputPlaceholder';

interface MockVariable {
  id: string;
  name: string;
  expression: string;
  nodePath: string;
}

interface MappingLine {
  sourceId: string;
  targetId: string;
}

/** Workflow step:
 * 1 = for-each already defined, its menu open → "Add Variable..."
 * 2 = Variable created ($taxAmount inside for-each, no expression)
 * 3 = Map price→$taxAmount (expression pre-filled with "price")
 * 4 / undefined = Final state (all expressions + all mapping lines)
 */
interface VariableMockupProps {
  step?: 1 | 2 | 3 | 4;
}

const PANEL_COLLAPSED_HEIGHT = 32;
const PANEL_MIN_HEIGHT = 32;

const VAR_NODE_PATH = 'Invoice/Subtotals/for-each($Orders/Order)';
const VAR_NO_EXPRESSION: MockVariable[] = [{ id: 'v1', name: 'taxAmount', expression: '', nodePath: VAR_NODE_PATH }];
const VAR_PARTIAL_EXPRESSION: MockVariable[] = [
  { id: 'v1', name: 'taxAmount', expression: 'Price', nodePath: VAR_NODE_PATH },
];
const VAR_WITH_EXPRESSION: MockVariable[] = [
  { id: 'v1', name: 'taxAmount', expression: 'Price * 0.1', nodePath: VAR_NODE_PATH },
];

const SUBTOTAL_EXPRESSION = 'Price + $taxAmount';

export const VariableMockup: FunctionComponent<VariableMockupProps> = ({ step }) => {
  const initialVariables =
    step === 1 ? [] : step === 2 ? VAR_NO_EXPRESSION : step === 3 ? VAR_PARTIAL_EXPRESSION : VAR_WITH_EXPRESSION;
  const showVarExpression = !step || step >= 3;
  const showFieldExpressions = !step || step >= 4;
  const hideMappingLines = step === 1 || step === 2;

  const [variables, setVariables] = useState<MockVariable[]>(initialVariables);
  const [isAddingTargetVar, setIsAddingTargetVar] = useState(false);
  const [renamingVarInTargetId, setRenamingVarInTargetId] = useState<string | null>(null);
  const [targetVarMenuOpenId, setTargetVarMenuOpenId] = useState<string | null>(null);
  const [isForEachMenuOpen, setIsForEachMenuOpen] = useState(false);
  const [isTargetExpanded, setIsTargetExpanded] = useState(true);
  const [isSubtotalExpanded, setIsSubtotalExpanded] = useState(true);
  const [nodeRefs, setNodeRefs] = useState<Record<string, DOMRect>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  /* Step 3: price → $taxAmount (fills variable expression)
   * Step 4: price + $taxAmount → Subtotal (both sources reused) */
  const allMappingLines: MappingLine[] = useMemo(
    () => [
      { sourceId: 'src-price', targetId: 'tgt-v1' },
      { sourceId: 'src-price', targetId: 'tgt-subtotal' },
      { sourceId: 'src-v1', targetId: 'tgt-subtotal' },
    ],
    [],
  );

  const mappingLines = useMemo(() => {
    if (step === 3) return allMappingLines.slice(0, 1);
    return allMappingLines;
  }, [step, allMappingLines]);

  const persistentLines: MappingLine[] = useMemo(() => [{ sourceId: 'src-order', targetId: 'tgt-for-each' }], []);

  useEffect(() => {
    if (step === 1) setIsForEachMenuOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const updatePositions = () => {
      const refs: Record<string, DOMRect> = {};
      const linesToTrack = [...persistentLines, ...(hideMappingLines ? [] : mappingLines)];
      for (const line of linesToTrack) {
        const srcEl = document.getElementById(line.sourceId);
        const tgtEl = document.getElementById(line.targetId);
        if (srcEl) refs[line.sourceId] = srcEl.getBoundingClientRect();
        if (tgtEl) refs[line.targetId] = tgtEl.getBoundingClientRect();
      }
      setNodeRefs(refs);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [
    variables,
    isAddingTargetVar,
    renamingVarInTargetId,
    isTargetExpanded,
    isSubtotalExpanded,
    mappingLines,
    hideMappingLines,
    persistentLines,
  ]);

  const containerRect = containerRef.current?.getBoundingClientRect();

  const handleAddVar = useCallback((name: string) => {
    setVariables((prev) => [...prev, { id: `v-${Date.now()}`, name, expression: '', nodePath: VAR_NODE_PATH }]);
    setIsAddingTargetVar(false);
  }, []);

  const handleRenameVar = useCallback((id: string, name: string) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, name } : v)));
    setRenamingVarInTargetId(null);
  }, []);

  const handleDeleteVar = useCallback((id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
    setTargetVarMenuOpenId(null);
  }, []);

  return (
    <div ref={containerRef} className="variable-mockup-view">
      <div className="variable-mockup-view__panels">
        {/* Source panel */}
        <div className="variable-mockup-view__source">
          <h3>Source</h3>
          <ExpansionPanels firstPanelId="variables-header" lastPanelId="source-body">
            <ExpansionPanel
              id="variables-header"
              summary={<div className="variable-section-header">Variables</div>}
              defaultExpanded={false}
              defaultHeight={PANEL_COLLAPSED_HEIGHT}
              minHeight={PANEL_MIN_HEIGHT}
            />

            {variables.map((variable) => (
              <ExpansionPanel
                key={variable.id}
                id={`var-${variable.id}`}
                summary={
                  <Tooltip
                    content={
                      <div>
                        <div>Path: {variable.nodePath}</div>
                        <div>Expression: {variable.expression || '(empty)'}</div>
                      </div>
                    }
                    position="right"
                  >
                    <div className="variable-row" id={`src-${variable.id}`}>
                      <Icon>
                        <Draggable />
                      </Icon>
                      <Label isCompact>$</Label>
                      <span className="variable-row__name">{variable.name}</span>
                    </div>
                  </Tooltip>
                }
                defaultExpanded={false}
                defaultHeight={PANEL_COLLAPSED_HEIGHT}
                minHeight={PANEL_MIN_HEIGHT}
              />
            ))}

            <ExpansionPanel
              id="parameters-header"
              summary={<div className="mock-parameters-header">Parameters</div>}
              defaultExpanded
              defaultHeight={PANEL_COLLAPSED_HEIGHT * 4}
              minHeight={PANEL_MIN_HEIGHT}
            >
              <div className="node__container">
                <div id="src-orders" className="node__header">
                  <BaseNode
                    isExpandable
                    isExpanded
                    isDraggable={false}
                    iconType={Types.Container}
                    title={<span className="node__spacer">Orders</span>}
                    rank={0}
                  />
                </div>
                <div className="node__children">
                  <div className="node__container">
                    <div id="src-order" className="node__header">
                      <BaseNode
                        isExpandable
                        isExpanded
                        isDraggable={false}
                        isCollectionField
                        iconType={Types.Container}
                        title={<span className="node__spacer">Order</span>}
                        rank={1}
                      />
                    </div>
                    <div className="node__children">
                      <div className="node__container">
                        <div className="node__header" id="src-price">
                          <BaseNode
                            isExpandable={false}
                            isDraggable
                            iconType={Types.Decimal}
                            title={<span className="node__spacer">Price</span>}
                            rank={2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ExpansionPanel>

            <ExpansionPanel
              id="source-body"
              summary={<div className="mock-parameters-header">Body</div>}
              defaultExpanded={false}
              defaultHeight={PANEL_COLLAPSED_HEIGHT}
              minHeight={PANEL_MIN_HEIGHT}
            />
          </ExpansionPanels>
        </div>

        {/* Target panel */}
        <div className="variable-mockup-view__target">
          <h3>Target</h3>
          <div className="mock-parameters-header">Body</div>
          <div className="node__container">
            <div className="node__header">
              <BaseNode
                isExpandable
                isExpanded={isTargetExpanded}
                onExpandChange={() => setIsTargetExpanded((p) => !p)}
                isDraggable={false}
                iconType={Types.Container}
                title={<span className="node__spacer">Invoice</span>}
                rank={0}
              />
            </div>

            {isTargetExpanded && (
              <div className="node__children">
                {/* Subtotal collection field */}
                <div className="node__container">
                  <div className="node__header">
                    <BaseNode
                      isExpandable
                      isExpanded={isSubtotalExpanded}
                      onExpandChange={() => setIsSubtotalExpanded((p) => !p)}
                      isDraggable={false}
                      iconType={Types.Decimal}
                      title={<span className="node__spacer">Subtotals</span>}
                      rank={1}
                    />
                  </div>

                  {isSubtotalExpanded && (
                    <div className="node__children">
                      {/* for-each node */}
                      <div className="node__container">
                        <div id="tgt-for-each" className="node__header">
                          <div className="for-each-row">
                            <Label>for-each</Label>
                            <input
                              className="tgt-xpath-input"
                              value="$Orders/Order"
                              readOnly
                              aria-label="for-each expression"
                            />
                            <div className="variable-node__actions">
                              <Dropdown
                                isOpen={isForEachMenuOpen}
                                onOpenChange={(isOpen) => setIsForEachMenuOpen(isOpen)}
                                toggle={(toggleRef: Ref<HTMLButtonElement>) => (
                                  <MenuToggle
                                    icon={<EllipsisVIcon />}
                                    ref={toggleRef}
                                    onClick={(e: MouseEvent) => {
                                      e.stopPropagation();
                                      setIsForEachMenuOpen(!isForEachMenuOpen);
                                    }}
                                    variant="plain"
                                    isExpanded={isForEachMenuOpen}
                                    aria-label="for-each actions"
                                  />
                                )}
                              >
                                <DropdownList>
                                  <DropdownItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsAddingTargetVar(true);
                                      setIsForEachMenuOpen(false);
                                    }}
                                  >
                                    Add Variable...
                                  </DropdownItem>
                                </DropdownList>
                              </Dropdown>
                              <Button variant="plain" icon={<TrashIcon />} aria-label="Delete for-each" />
                            </div>
                          </div>
                        </div>

                        <div className="node__children">
                          {/* Variable nodes inside for-each */}
                          {variables.map((variable) =>
                            renamingVarInTargetId === variable.id ? (
                              <div key={`tgt-renaming-${variable.id}`} className="node__container">
                                <div className="node__header">
                                  <VariableInputPlaceholder
                                    initialName={variable.name}
                                    onConfirm={(name) => handleRenameVar(variable.id, name)}
                                    onCancel={() => setRenamingVarInTargetId(null)}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div key={variable.id} className="node__container">
                                <div id={`tgt-${variable.id}`} className="node__header">
                                  <div className="tgt-variable-row">
                                    <Label isCompact>$</Label>
                                    <span style={{ marginLeft: '0.25rem' }}>{variable.name}</span>
                                    {showVarExpression && (
                                      <input
                                        className="tgt-xpath-input"
                                        value={variable.expression}
                                        readOnly
                                        aria-label="XPath expression"
                                      />
                                    )}
                                    <div className="variable-node__actions">
                                      <Tooltip content="Edit XPath expression">
                                        <Button variant="plain" icon={<PencilAltIcon />} aria-label="Edit XPath" />
                                      </Tooltip>
                                      <Dropdown
                                        isOpen={targetVarMenuOpenId === variable.id}
                                        onOpenChange={(isOpen) => setTargetVarMenuOpenId(isOpen ? variable.id : null)}
                                        toggle={(toggleRef: Ref<HTMLButtonElement>) => (
                                          <MenuToggle
                                            icon={<EllipsisVIcon />}
                                            ref={toggleRef}
                                            onClick={(e: MouseEvent) => {
                                              e.stopPropagation();
                                              setTargetVarMenuOpenId(
                                                targetVarMenuOpenId === variable.id ? null : variable.id,
                                              );
                                            }}
                                            variant="plain"
                                            isExpanded={targetVarMenuOpenId === variable.id}
                                            aria-label="Variable actions"
                                          />
                                        )}
                                      >
                                        <DropdownList>
                                          <DropdownItem
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setRenamingVarInTargetId(variable.id);
                                              setTargetVarMenuOpenId(null);
                                            }}
                                          >
                                            Rename variable...
                                          </DropdownItem>
                                        </DropdownList>
                                      </Dropdown>
                                      <Button
                                        variant="plain"
                                        icon={<TrashIcon />}
                                        aria-label="Delete variable"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteVar(variable.id);
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}

                          {isAddingTargetVar && (
                            <div className="node__container">
                              <div className="node__header">
                                <VariableInputPlaceholder
                                  onConfirm={handleAddVar}
                                  onCancel={() => setIsAddingTargetVar(false)}
                                />
                              </div>
                            </div>
                          )}

                          {/* Subtotal field item inside for-each */}
                          <div className="node__container">
                            <div id="tgt-subtotal" className="node__header">
                              <BaseNode
                                isExpandable={false}
                                isDraggable={false}
                                isCollectionField
                                iconType={Types.Decimal}
                                title={<span className="node__spacer">Subtotal</span>}
                                rank={2}
                              >
                                {showFieldExpressions && (
                                  <input
                                    className="tgt-xpath-input"
                                    value={SUBTOTAL_EXPRESSION}
                                    readOnly
                                    aria-label="XPath expression"
                                  />
                                )}
                                {showFieldExpressions && (
                                  <div className="variable-node__actions">
                                    <Button variant="plain" icon={<TrashIcon />} aria-label="Delete mapping" />
                                  </div>
                                )}
                              </BaseNode>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {containerRect && (
        <svg className="variable-mockup-view__lines" data-testid="mapping-lines">
          {[...persistentLines, ...(hideMappingLines ? [] : mappingLines)].map((line) => {
            const srcRect = nodeRefs[line.sourceId];
            const tgtRect = nodeRefs[line.targetId];
            if (!srcRect || !tgtRect) return null;
            const x1 = srcRect.right - containerRect.left;
            const y1 = srcRect.top + srcRect.height / 2 - containerRect.top;
            const x2 = tgtRect.left - containerRect.left;
            const y2 = tgtRect.top + tgtRect.height / 2 - containerRect.top;
            return (
              <line
                key={`${line.sourceId}-${line.targetId}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#0066cc"
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
