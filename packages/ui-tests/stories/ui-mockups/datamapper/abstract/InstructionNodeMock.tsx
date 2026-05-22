import './AbstractTreeMock.scss';

import { ChevronDown, ChevronRight } from '@carbon/icons-react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  Label,
  MenuToggle,
  MenuToggleElement,
  TextInput,
} from '@patternfly/react-core';
import { EllipsisVIcon, TrashIcon } from '@patternfly/react-icons';
import { FunctionComponent, Ref, useCallback, useMemo, useRef, useState } from 'react';

import { AddFieldCandidateModal } from './AddFieldCandidateModal';
import { DocMenuItem, FieldRow, MappingMenuItem } from './FieldRow';
import { getAbstractDisplayName, MockAbstractNode, MockFieldNode, MockInstruction } from './mockAbstractData';

interface InstructionNodeMockProps {
  instruction: MockInstruction;
  rank: number;
  onRemove: () => void;
  onDuplicateIf?: (fieldIds: string[]) => void;
  onWrapWith?: (kind: string) => void;
  abstractNode?: MockAbstractNode;
}

export const InstructionNodeMock: FunctionComponent<InstructionNodeMockProps> = ({
  instruction,
  rank,
  onRemove,
  onDuplicateIf,
  onWrapWith,
  abstractNode,
}) => {
  const [expression, setExpression] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [childInstructions, setChildInstructions] = useState<MockInstruction[]>(instruction.children ?? []);
  const [childFields, setChildFields] = useState<{ slotId: string; candidate?: MockFieldNode }[]>(() => {
    if (instruction.initialFieldIds && abstractNode) {
      return instruction.initialFieldIds
        .map((id) => ({
          slotId: `slot-${id}`,
          candidate: abstractNode.candidates.find((c) => c.id === id),
        }))
        .filter((slot) => slot.candidate);
    }
    return [];
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<string | null>(null);
  const [placeholderDismissed, setPlaceholderDismissed] = useState(false);
  const counterRef = useRef(0);

  const isCollection = abstractNode ? abstractNode.maxOccurs === -1 || abstractNode.maxOccurs > 1 : false;
  const hasExpression = instruction.kind === 'for-each' || instruction.kind === 'if' || instruction.kind === 'when';
  const canAddInstruction = instruction.kind !== 'choose';
  const canAddWhen = instruction.kind === 'choose';
  const hasOtherwise = childInstructions.some((c) => c.kind === 'otherwise');
  const showAbstractPlaceholder =
    !!instruction.showAbstractField && !placeholderDismissed && childFields.length === 0 && !!abstractNode;
  const hasChildren = showAbstractPlaceholder || childInstructions.length > 0 || childFields.length > 0;

  const generateId = useCallback(() => {
    return `${Date.now()}-${counterRef.current++}`;
  }, []);

  const handleAddChildInstruction = useCallback(
    (kind: string) => {
      const uid = generateId();
      let newInstruction: MockInstruction;
      if (kind === 'choose') {
        newInstruction = {
          id: `choose-${uid}`,
          kind: 'choose',
          children: [
            { id: `when-${uid}`, kind: 'when' },
            { id: `otherwise-${uid}`, kind: 'otherwise' },
          ],
        };
      } else {
        newInstruction = { id: `${kind}-${uid}`, kind: kind as MockInstruction['kind'] };
      }
      setChildInstructions((prev) => [...prev, newInstruction]);
      setIsMenuOpen(false);
    },
    [generateId],
  );

  const handleAddWhen = useCallback(() => {
    const uid = generateId();
    const newWhen: MockInstruction = { id: `when-${uid}`, kind: 'when' };
    setChildInstructions((prev) => {
      const lastIndex = prev.length - 1;
      if (lastIndex >= 0 && prev[lastIndex].kind === 'otherwise') {
        return [...prev.slice(0, lastIndex), newWhen, prev[lastIndex]];
      }
      return [...prev, newWhen];
    });
  }, [generateId]);

  const handleAddOtherwise = useCallback(() => {
    const uid = generateId();
    setChildInstructions((prev) => [...prev, { id: `otherwise-${uid}`, kind: 'otherwise' }]);
  }, [generateId]);

  const handleRemoveChild = useCallback((childId: string) => {
    setChildInstructions((prev) => prev.filter((i) => i.id !== childId));
  }, []);

  const handleModalConfirm = useCallback(
    (candidateId: string) => {
      if (!abstractNode) return;
      const candidate = abstractNode.candidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      if (modalTarget === 'new') {
        const slotId = `slot-${generateId()}`;
        setChildFields((prev) => [...prev, { slotId, candidate }]);
      } else if (modalTarget) {
        setChildFields((prev) => prev.map((slot) => (slot.slotId === modalTarget ? { ...slot, candidate } : slot)));
      }
      setModalTarget(null);
    },
    [abstractNode, modalTarget, generateId],
  );

  const handleClearSubstitution = useCallback((slotId: string) => {
    setChildFields((prev) => prev.map((slot) => (slot.slotId === slotId ? { slotId: slot.slotId } : slot)));
  }, []);

  const handleRemoveField = useCallback((slotId: string) => {
    setChildFields((prev) => prev.filter((slot) => slot.slotId !== slotId));
  }, []);

  const handleDuplicateField = useCallback(
    (sourceSlot: { slotId: string; candidate?: MockFieldNode }) => {
      const newSlotId = `slot-${generateId()}`;
      setChildFields((prev) => [...prev, { slotId: newSlotId, candidate: sourceSlot.candidate }]);
    },
    [generateId],
  );

  const handleWrapField = useCallback(
    (kind: string, slot?: { slotId: string; candidate?: MockFieldNode }) => {
      const uid = generateId();
      const initialFieldIds = slot?.candidate ? [slot.candidate.id] : undefined;
      const showAbstractField = !slot?.candidate;
      let newInstruction: MockInstruction;
      if (kind === 'choose') {
        newInstruction = {
          id: `choose-${uid}`,
          kind: 'choose',
          children: [
            { id: `when-${uid}`, kind: 'when', showAbstractField, initialFieldIds },
            { id: `otherwise-${uid}`, kind: 'otherwise' },
          ],
        };
      } else {
        newInstruction = {
          id: `${kind}-${uid}`,
          kind: kind as MockInstruction['kind'],
          showAbstractField,
          initialFieldIds,
        };
      }
      setChildInstructions((prev) => [...prev, newInstruction]);
      if (slot) {
        setChildFields((prev) => prev.filter((s) => s.slotId !== slot.slotId));
      } else {
        setPlaceholderDismissed(true);
      }
    },
    [generateId],
  );

  const buildFieldMappingItems = useCallback(
    (slot: { slotId: string; candidate?: MockFieldNode }): MappingMenuItem[] => {
      const items: MappingMenuItem[] = [];
      if (isCollection) {
        items.push({
          key: 'wrap-for-each',
          label: 'Wrap with "for-each"',
          onClick: () => handleWrapField('for-each', slot),
        });
      }
      items.push({
        key: 'wrap-if',
        label: 'Wrap with "if"',
        onClick: () => handleWrapField('if', slot),
      });
      items.push({
        key: 'wrap-choose',
        label: 'Wrap with "choose-when-otherwise"',
        onClick: () => handleWrapField('choose', slot),
      });
      if (isCollection) {
        items.push({
          key: 'dup-field',
          label: 'Duplicate Field',
          onClick: () => handleDuplicateField(slot),
        });
      }
      return items;
    },
    [isCollection, handleWrapField, handleDuplicateField],
  );

  const renderContextMenuToggle = useCallback(
    (toggleRef: Ref<MenuToggleElement>) => (
      <MenuToggle
        icon={<EllipsisVIcon />}
        ref={toggleRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsMenuOpen((prev) => !prev);
        }}
        variant="plain"
        isExpanded={isMenuOpen}
        size="sm"
        aria-label="Actions"
      />
    ),
    [isMenuOpen],
  );

  const placeholderDocItems = useMemo(
    (): DocMenuItem[] => [{ key: 'select-sub', label: 'Select Substitution', onClick: () => setModalTarget('new') }],
    [],
  );

  const buildPlaceholderMappingItems = useMemo((): MappingMenuItem[] => {
    const items: MappingMenuItem[] = [];
    if (isCollection) {
      items.push({ key: 'wrap-for-each', label: 'Wrap with "for-each"', onClick: () => handleWrapField('for-each') });
    }
    items.push({ key: 'wrap-if', label: 'Wrap with "if"', onClick: () => handleWrapField('if') });
    items.push({
      key: 'wrap-choose',
      label: 'Wrap with "choose-when-otherwise"',
      onClick: () => handleWrapField('choose'),
    });
    if (isCollection) {
      items.push({
        key: 'dup-field',
        label: 'Duplicate Field',
        onClick: () => {
          const slotId = `slot-${generateId()}`;
          setChildFields((prev) => [...prev, { slotId }]);
        },
      });
    }
    return items;
  }, [isCollection, handleWrapField, generateId]);

  return (
    <div className="node__container" data-testid={`instruction-${instruction.id}`}>
      <section className="abstract-tree__instruction-node" style={{ '--node-rank': rank } as React.CSSProperties}>
        {hasChildren ? (
          <Icon className="abstract-tree__field-expand" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </Icon>
        ) : (
          <span className="abstract-tree__field-expand-placeholder" />
        )}
        <Label isCompact variant="outline" color="purple">
          {instruction.kind}
        </Label>
        {hasExpression && (
          <TextInput
            type="text"
            value={expression}
            onChange={(_e, val) => setExpression(val)}
            placeholder={instruction.kind === 'for-each' ? 'select expression' : 'test expression'}
            className="abstract-tree__instruction-input"
          />
        )}
        <div className="abstract-tree__instruction-actions">
          <Dropdown
            onSelect={(e) => {
              e?.stopPropagation();
              setIsMenuOpen(false);
            }}
            toggle={renderContextMenuToggle}
            isOpen={isMenuOpen}
            onOpenChange={setIsMenuOpen}
            popperProps={{ position: 'end' }}
            zIndex={100}
          >
            <DropdownList>
              {canAddInstruction && abstractNode && (
                <DropdownItem
                  key="add-field"
                  onClick={() => {
                    setModalTarget('new');
                    setIsMenuOpen(false);
                  }}
                >
                  Add Field
                </DropdownItem>
              )}
              {canAddInstruction && (
                <DropdownItem key="add-for-each" onClick={() => handleAddChildInstruction('for-each')}>
                  Add for-each
                </DropdownItem>
              )}
              {canAddInstruction && (
                <DropdownItem key="add-choose" onClick={() => handleAddChildInstruction('choose')}>
                  Add choose-when-otherwise
                </DropdownItem>
              )}
              {canAddWhen && (
                <DropdownItem key="add-when" onClick={handleAddWhen}>
                  Add when
                </DropdownItem>
              )}
              {canAddWhen && !hasOtherwise && (
                <DropdownItem key="add-otherwise" onClick={handleAddOtherwise}>
                  Add otherwise
                </DropdownItem>
              )}
              {instruction.kind === 'if' && onDuplicateIf && (
                <DropdownItem
                  key="duplicate-if"
                  onClick={() =>
                    onDuplicateIf(childFields.filter((slot) => slot.candidate).map((slot) => slot.candidate!.id))
                  }
                >
                  Duplicate &quot;if&quot;
                </DropdownItem>
              )}
              {onWrapWith && isCollection && (
                <DropdownItem key="wrap-for-each" onClick={() => onWrapWith('for-each')}>
                  Wrap with &quot;for-each&quot;
                </DropdownItem>
              )}
              {onWrapWith && (
                <DropdownItem key="wrap-if" onClick={() => onWrapWith('if')}>
                  Wrap with &quot;if&quot;
                </DropdownItem>
              )}
              {onWrapWith && (
                <DropdownItem key="wrap-choose" onClick={() => onWrapWith('choose')}>
                  Wrap with &quot;choose-when-otherwise&quot;
                </DropdownItem>
              )}
            </DropdownList>
          </Dropdown>
          <Button variant="plain" icon={<TrashIcon />} size="sm" onClick={onRemove} aria-label="Delete" />
        </div>
      </section>
      {hasChildren && isExpanded && (
        <div className="node__children">
          {showAbstractPlaceholder && abstractNode && (
            <FieldRow
              rank={rank + 1}
              name={abstractNode.elementName}
              typeOrCandidates={getAbstractDisplayName(abstractNode)}
              isAbstract
              docMenuItems={placeholderDocItems}
              mappingMenuItems={buildPlaceholderMappingItems}
              onRemove={() => setPlaceholderDismissed(true)}
            />
          )}
          {childFields.map((slot) =>
            slot.candidate ? (
              <FieldRow
                key={slot.slotId}
                rank={rank + 1}
                name={slot.candidate.displayName}
                typeOrCandidates={slot.candidate.type}
                docMenuItems={[
                  {
                    key: 'clear-sub',
                    label: 'Clear Substitution',
                    onClick: () => handleClearSubstitution(slot.slotId),
                  },
                ]}
                mappingMenuItems={buildFieldMappingItems(slot)}
                onRemove={() => handleRemoveField(slot.slotId)}
              />
            ) : (
              <FieldRow
                key={slot.slotId}
                rank={rank + 1}
                name={abstractNode!.elementName}
                typeOrCandidates={getAbstractDisplayName(abstractNode!)}
                isAbstract
                docMenuItems={[
                  { key: 'select-sub', label: 'Select Substitution', onClick: () => setModalTarget(slot.slotId) },
                ]}
                mappingMenuItems={buildFieldMappingItems(slot)}
                onRemove={() => handleRemoveField(slot.slotId)}
              />
            ),
          )}
          {childInstructions.map((child) => (
            <InstructionNodeMock
              key={child.id}
              instruction={child}
              rank={rank + 1}
              onRemove={() => handleRemoveChild(child.id)}
              onDuplicateIf={
                child.kind === 'if'
                  ? (fieldIds) => {
                      const uid = generateId();
                      setChildInstructions((prev) => [
                        ...prev,
                        { id: `if-${uid}`, kind: 'if' as const, initialFieldIds: fieldIds },
                      ]);
                    }
                  : undefined
              }
              onWrapWith={(kind) => {
                const uid = generateId();
                let wrapper: MockInstruction;
                if (kind === 'choose') {
                  wrapper = {
                    id: `choose-${uid}`,
                    kind: 'choose',
                    children: [
                      { id: `when-${uid}`, kind: 'when', children: [child] },
                      { id: `otherwise-${uid}`, kind: 'otherwise' },
                    ],
                  };
                } else {
                  wrapper = {
                    id: `${kind}-${uid}`,
                    kind: kind as MockInstruction['kind'],
                    children: [child],
                  };
                }
                setChildInstructions((prev) => prev.map((c) => (c.id === child.id ? wrapper : c)));
              }}
              abstractNode={abstractNode}
            />
          ))}
        </div>
      )}
      {modalTarget !== null && abstractNode && (
        <AddFieldCandidateModal
          isOpen={modalTarget !== null}
          onClose={() => setModalTarget(null)}
          onConfirm={handleModalConfirm}
          abstractNode={abstractNode}
        />
      )}
    </div>
  );
};
