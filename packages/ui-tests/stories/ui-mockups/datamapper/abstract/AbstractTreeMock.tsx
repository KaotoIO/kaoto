import './AbstractTreeMock.scss';

import { FunctionComponent, useCallback, useMemo, useState } from 'react';

import { AddFieldCandidateModal } from './AddFieldCandidateModal';
import { DocMenuItem, FieldRow, MappingMenuItem } from './FieldRow';
import { InstructionNodeMock } from './InstructionNodeMock';
import {
  getAbstractDisplayName,
  isAbstractNode,
  MockAbstractNode,
  MockAbstractTreeNode,
  MockFieldNode,
  MockInstruction,
} from './mockAbstractData';

export interface AbstractInstance {
  instanceId: string;
  candidateId?: string;
}

interface AbstractTreeMockProps {
  treeNode: MockAbstractTreeNode;
  rank?: number;
  substitutions: Record<string, AbstractInstance[]>;
  onSelectSubstitute: (abstractId: string, instanceId: string, candidateId: string) => void;
  onClearSubstitution: (abstractId: string, instanceId: string) => void;
  onDuplicate: (abstractId: string, sourceInstanceId?: string) => void;
  onRemoveInstance: (abstractId: string, instanceId: string) => void;
  instructions?: Record<string, MockInstruction[]>;
  onAddInstruction?: (abstractId: string, kind: string, initialFieldIds?: string[]) => void;
  onRemoveInstruction?: (abstractId: string, instructionId: string) => void;
  onWrapInstruction?: (abstractId: string, instructionId: string, kind: string) => void;
  'data-testid'?: string;
}

export const AbstractTreeMock: FunctionComponent<AbstractTreeMockProps> = ({
  treeNode,
  rank = 0,
  substitutions,
  onSelectSubstitute,
  onClearSubstitution,
  onDuplicate,
  onRemoveInstance,
  instructions,
  onAddInstruction,
  onRemoveInstruction,
  onWrapInstruction,
  'data-testid': dataTestId,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => new Set<string>());

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

  if (isAbstractNode(treeNode)) {
    return (
      <AbstractNodeRenderer
        abstractNode={treeNode}
        rank={rank}
        substitutions={substitutions}
        onSelectSubstitute={onSelectSubstitute}
        onClearSubstitution={onClearSubstitution}
        onDuplicate={onDuplicate}
        onRemoveInstance={onRemoveInstance}
        instructions={instructions}
        onAddInstruction={onAddInstruction}
        onRemoveInstruction={onRemoveInstruction}
        onWrapInstruction={onWrapInstruction}
        expandedNodes={expandedNodes}
        toggleExpansion={toggleExpansion}
        data-testid={dataTestId || `abstract-${treeNode.id}`}
      />
    );
  }

  const fieldNode = treeNode as MockFieldNode;
  const hasChildren = fieldNode.children && fieldNode.children.length > 0;
  const isExpanded = expandedNodes.has(fieldNode.id) || (hasChildren && rank === 0);

  return (
    <FieldRow
      rank={rank}
      name={fieldNode.displayName}
      typeOrCandidates={fieldNode.type}
      showChoicesIcon={false}
      expandable={hasChildren}
      isExpanded={isExpanded}
      onToggle={() => {
        toggleExpansion(fieldNode.id);
      }}
      data-testid={dataTestId || `node-${fieldNode.id}`}
    >
      {fieldNode.children?.map((child) => (
        <AbstractTreeMock
          key={child.id}
          treeNode={child}
          rank={rank + 1}
          substitutions={substitutions}
          onSelectSubstitute={onSelectSubstitute}
          onClearSubstitution={onClearSubstitution}
          onDuplicate={onDuplicate}
          onRemoveInstance={onRemoveInstance}
          instructions={instructions}
          onAddInstruction={onAddInstruction}
          onRemoveInstruction={onRemoveInstruction}
          onWrapInstruction={onWrapInstruction}
          data-testid={`child-${child.id}`}
        />
      ))}
    </FieldRow>
  );
};

interface AbstractNodeRendererProps {
  abstractNode: MockAbstractNode;
  rank: number;
  substitutions: Record<string, AbstractInstance[]>;
  onSelectSubstitute: (abstractId: string, instanceId: string, candidateId: string) => void;
  onClearSubstitution: (abstractId: string, instanceId: string) => void;
  onDuplicate: (abstractId: string, sourceInstanceId?: string) => void;
  onRemoveInstance: (abstractId: string, instanceId: string) => void;
  instructions?: Record<string, MockInstruction[]>;
  onAddInstruction?: (abstractId: string, kind: string, initialFieldIds?: string[]) => void;
  onRemoveInstruction?: (abstractId: string, instructionId: string) => void;
  onWrapInstruction?: (abstractId: string, instructionId: string, kind: string) => void;
  expandedNodes: Set<string>;
  toggleExpansion: (nodeId: string) => void;
  'data-testid'?: string;
}

const AbstractNodeRenderer: FunctionComponent<AbstractNodeRendererProps> = ({
  abstractNode,
  rank,
  substitutions,
  onSelectSubstitute,
  onClearSubstitution,
  onDuplicate,
  onRemoveInstance,
  instructions,
  onAddInstruction,
  onRemoveInstruction,
  onWrapInstruction,
  expandedNodes,
  toggleExpansion,
  'data-testid': dataTestId,
}) => {
  const isCollection = abstractNode.maxOccurs === -1 || abstractNode.maxOccurs > 1;
  const instances = useMemo(() => substitutions[abstractNode.id] ?? [], [substitutions, abstractNode.id]);
  const instructionList = instructions?.[abstractNode.id] ?? [];
  const hasInstructions = instructionList.length > 0;
  const hasInstances = instances.length > 0;

  const [isSubstituteModalOpen, setIsSubstituteModalOpen] = useState(false);

  const handleSelectSubstitute = useCallback(
    (candidateId: string) => {
      const instanceId = `inst-${Date.now()}`;
      onSelectSubstitute(abstractNode.id, instanceId, candidateId);
      setIsSubstituteModalOpen(false);
    },
    [abstractNode.id, onSelectSubstitute],
  );

  const handleAddInstructionWithFields = useCallback(
    (abstractId: string, kind: string) => {
      const fieldIds = instances.filter((i) => i.candidateId).map((i) => i.candidateId!);
      onAddInstruction?.(abstractId, kind, fieldIds);
    },
    [instances, onAddInstruction],
  );

  const buildWrapActions = useCallback((): MappingMenuItem[] => {
    const items: MappingMenuItem[] = [];
    if (isCollection) {
      items.push({
        key: 'wrap-for-each',
        label: 'Wrap with "for-each"',
        onClick: () => {
          handleAddInstructionWithFields(abstractNode.id, 'for-each');
        },
      });
    }
    items.push({
      key: 'wrap-if',
      label: 'Wrap with "if"',
      onClick: () => {
        handleAddInstructionWithFields(abstractNode.id, 'if');
      },
    });
    items.push({
      key: 'wrap-choose',
      label: 'Wrap with "choose-when-otherwise"',
      onClick: () => {
        handleAddInstructionWithFields(abstractNode.id, 'choose');
      },
    });
    return items;
  }, [abstractNode.id, isCollection, handleAddInstructionWithFields]);

  const abstractRowDocItems = useMemo(
    (): DocMenuItem[] => [
      {
        key: 'select-sub',
        label: 'Select Substitution',
        onClick: () => {
          setIsSubstituteModalOpen(true);
        },
      },
    ],
    [],
  );

  const abstractRowMappingItems = useMemo((): MappingMenuItem[] => {
    const items = buildWrapActions();
    if (isCollection) {
      items.push({
        key: 'dup-field',
        label: 'Duplicate Field',
        onClick: () => {
          onDuplicate(abstractNode.id);
        },
      });
    }
    return items;
  }, [abstractNode.id, isCollection, buildWrapActions, onDuplicate]);

  const renderAbstractRow = (rowRank: number) => (
    <FieldRow
      rank={rowRank}
      name={abstractNode.elementName}
      typeOrCandidates={getAbstractDisplayName(abstractNode)}
      isAbstract
      isCollection={isCollection}
      docMenuItems={abstractRowDocItems}
      mappingMenuItems={abstractRowMappingItems}
      data-testid={dataTestId}
    />
  );

  const renderInstanceNodes = (instanceRank: number) =>
    instances.map((inst) => {
      const candidate = inst.candidateId ? abstractNode.candidates.find((c) => c.id === inst.candidateId) : undefined;

      if (candidate) {
        const docItems: DocMenuItem[] = [
          {
            key: 'clear-sub',
            label: 'Clear Substitution',
            onClick: () => {
              onClearSubstitution(abstractNode.id, inst.instanceId);
            },
          },
        ];
        const mappingItems: MappingMenuItem[] = [...buildWrapActions()];
        if (isCollection) {
          mappingItems.push({
            key: 'dup-field',
            label: 'Duplicate Field',
            onClick: () => {
              onDuplicate(abstractNode.id, inst.instanceId);
            },
          });
        }

        const nodeKey = `${abstractNode.id}-${inst.instanceId}`;
        const hasChildren = candidate.children && candidate.children.length > 0;
        const isExpanded = expandedNodes.has(nodeKey);

        return (
          <FieldRow
            key={inst.instanceId}
            rank={instanceRank}
            name={candidate.displayName}
            typeOrCandidates={candidate.type}
            isCollection={isCollection}
            expandable={hasChildren}
            isExpanded={isExpanded}
            onToggle={() => {
              toggleExpansion(nodeKey);
            }}
            docMenuItems={docItems}
            mappingMenuItems={mappingItems}
            onRemove={
              isCollection
                ? () => {
                    onRemoveInstance(abstractNode.id, inst.instanceId);
                  }
                : undefined
            }
            data-testid={`substituted-${inst.instanceId}`}
          >
            {candidate.children?.map((child) => (
              <AbstractTreeMock
                key={child.id}
                treeNode={child}
                rank={instanceRank + 1}
                substitutions={substitutions}
                onSelectSubstitute={onSelectSubstitute}
                onClearSubstitution={onClearSubstitution}
                onDuplicate={onDuplicate}
                onRemoveInstance={onRemoveInstance}
                instructions={instructions}
                onAddInstruction={onAddInstruction}
                onRemoveInstruction={onRemoveInstruction}
                onWrapInstruction={onWrapInstruction}
                data-testid={`child-${child.id}`}
              />
            ))}
          </FieldRow>
        );
      }

      return (
        <UnsubstitutedInstanceRow
          key={inst.instanceId}
          abstractNode={abstractNode}
          instanceId={inst.instanceId}
          rank={instanceRank}
          isCollection={isCollection}
          buildWrapActions={buildWrapActions}
          onSelectSubstitute={onSelectSubstitute}
          onDuplicate={onDuplicate}
          onRemoveInstance={onRemoveInstance}
        />
      );
    });

  const substituteModal = isSubstituteModalOpen && (
    <AddFieldCandidateModal
      isOpen={isSubstituteModalOpen}
      onClose={() => {
        setIsSubstituteModalOpen(false);
      }}
      onConfirm={handleSelectSubstitute}
      abstractNode={abstractNode}
    />
  );

  if (hasInstructions) {
    return (
      <>
        {instructionList.map((inst) => (
          <InstructionNodeMock
            key={inst.id}
            instruction={inst}
            rank={rank}
            onRemove={() => onRemoveInstruction?.(abstractNode.id, inst.id)}
            onDuplicateIf={
              inst.kind === 'if'
                ? (fieldIds) => {
                    onAddInstruction?.(abstractNode.id, 'if', fieldIds);
                  }
                : undefined
            }
            onWrapWith={(kind) => onWrapInstruction?.(abstractNode.id, inst.id, kind)}
            abstractNode={abstractNode}
          />
        ))}
        {substituteModal}
      </>
    );
  }

  return (
    <>
      {hasInstances ? renderInstanceNodes(rank) : renderAbstractRow(rank)}
      {substituteModal}
    </>
  );
};

interface UnsubstitutedInstanceRowProps {
  abstractNode: MockAbstractNode;
  instanceId: string;
  rank: number;
  isCollection: boolean;
  buildWrapActions: () => MappingMenuItem[];
  onSelectSubstitute: (abstractId: string, instanceId: string, candidateId: string) => void;
  onDuplicate: (abstractId: string, sourceInstanceId?: string) => void;
  onRemoveInstance: (abstractId: string, instanceId: string) => void;
}

const UnsubstitutedInstanceRow: FunctionComponent<UnsubstitutedInstanceRowProps> = ({
  abstractNode,
  instanceId,
  rank,
  isCollection,
  buildWrapActions,
  onSelectSubstitute,
  onDuplicate,
  onRemoveInstance,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectSubstitute = useCallback(
    (candidateId: string) => {
      onSelectSubstitute(abstractNode.id, instanceId, candidateId);
      setIsModalOpen(false);
    },
    [abstractNode.id, instanceId, onSelectSubstitute],
  );

  const docItems = useMemo(
    (): DocMenuItem[] => [
      {
        key: 'select-sub',
        label: 'Select Substitution',
        onClick: () => {
          setIsModalOpen(true);
        },
      },
    ],
    [],
  );

  const mappingItems = useMemo((): MappingMenuItem[] => {
    const items = buildWrapActions();
    items.push({
      key: 'dup-field',
      label: 'Duplicate Field',
      onClick: () => {
        onDuplicate(abstractNode.id, instanceId);
      },
    });
    return items;
  }, [abstractNode.id, instanceId, buildWrapActions, onDuplicate]);

  return (
    <>
      <FieldRow
        rank={rank}
        name={abstractNode.elementName}
        typeOrCandidates={getAbstractDisplayName(abstractNode)}
        isAbstract
        isCollection={isCollection}
        docMenuItems={docItems}
        mappingMenuItems={mappingItems}
        onRemove={() => {
          onRemoveInstance(abstractNode.id, instanceId);
        }}
        data-testid={`unsubstituted-${instanceId}`}
      />
      {isModalOpen && (
        <AddFieldCandidateModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
          }}
          onConfirm={handleSelectSubstitute}
          abstractNode={abstractNode}
        />
      )}
    </>
  );
};
