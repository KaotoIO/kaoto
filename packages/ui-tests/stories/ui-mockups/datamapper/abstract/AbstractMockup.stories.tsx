import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent, useCallback, useRef, useState } from 'react';

import { AbstractInstance, AbstractTreeMock } from './AbstractTreeMock';
import {
  MockAbstractTreeNode,
  MockInstruction,
  mockManyRoot,
  mockZooCollection,
  mockZooSingle,
} from './mockAbstractData';

export default {
  title: 'UI Mockups/DataMapper/Abstract Field Mockup',
  component: AbstractTreeMock,
} as Meta<typeof AbstractTreeMock>;

interface TemplateArgs {
  mockData: MockAbstractTreeNode;
  initialSubstitutions?: Record<string, AbstractInstance[]>;
}

const Template: FunctionComponent<TemplateArgs> = (args) => {
  const [substitutions, setSubstitutions] = useState<Record<string, AbstractInstance[]>>(
    args.initialSubstitutions || {},
  );
  const [instructions, setInstructions] = useState<Record<string, MockInstruction[]>>({});
  const instructionCounterRef = useRef(0);

  const handleSelectSubstitute = useCallback((abstractId: string, instanceId: string, candidateId: string) => {
    setSubstitutions((prev) => {
      const existing = prev[abstractId] ?? [];
      const updated = existing.map((inst) => (inst.instanceId === instanceId ? { ...inst, candidateId } : inst));
      const found = updated.some((inst) => inst.instanceId === instanceId);
      if (!found) {
        updated.push({ instanceId, candidateId });
      }
      return { ...prev, [abstractId]: updated };
    });
  }, []);

  const handleClearSubstitution = useCallback((abstractId: string, instanceId: string) => {
    setSubstitutions((prev) => {
      const existing = prev[abstractId] ?? [];
      if (existing.length === 1 && existing[0].instanceId === instanceId) {
        const newSubs = { ...prev };
        delete newSubs[abstractId];
        return newSubs;
      }
      return {
        ...prev,
        [abstractId]: existing.map((inst) =>
          inst.instanceId === instanceId ? { ...inst, candidateId: undefined } : inst,
        ),
      };
    });
  }, []);

  const handleDuplicate = useCallback((abstractId: string, sourceInstanceId?: string) => {
    setSubstitutions((prev) => {
      const existing = prev[abstractId] ?? [];
      if (!sourceInstanceId) {
        return {
          ...prev,
          [abstractId]: [
            ...existing,
            { instanceId: `inst-orig-${Date.now()}` },
            { instanceId: `inst-dup-${Date.now() + 1}` },
          ],
        };
      }
      const source = existing.find((inst) => inst.instanceId === sourceInstanceId);
      return {
        ...prev,
        [abstractId]: [...existing, { instanceId: `inst-dup-${Date.now()}`, candidateId: source?.candidateId }],
      };
    });
  }, []);

  const handleRemoveInstance = useCallback((abstractId: string, instanceId: string) => {
    setSubstitutions((prev) => {
      const existing = prev[abstractId] ?? [];
      const updated = existing.filter((inst) => inst.instanceId !== instanceId);
      if (updated.length === 0) {
        const newSubs = { ...prev };
        delete newSubs[abstractId];
        return newSubs;
      }
      return { ...prev, [abstractId]: updated };
    });
  }, []);

  const handleAddInstruction = useCallback((abstractId: string, kind: string, initialFieldIds?: string[]) => {
    const uid = `${Date.now()}-${instructionCounterRef.current++}`;
    let newInstruction: MockInstruction;
    const showAbstract = initialFieldIds !== undefined && initialFieldIds.length === 0;
    if (kind === 'choose') {
      newInstruction = {
        id: `choose-${uid}`,
        kind: 'choose',
        children: [
          { id: `when-${uid}`, kind: 'when', initialFieldIds, showAbstractField: showAbstract },
          { id: `otherwise-${uid}`, kind: 'otherwise' },
        ],
      };
    } else {
      newInstruction = {
        id: `${kind}-${uid}`,
        kind: kind as MockInstruction['kind'],
        initialFieldIds,
        showAbstractField: showAbstract,
      };
    }
    setInstructions((prev) => {
      const existing = prev[abstractId] ?? [];
      return { ...prev, [abstractId]: [...existing, newInstruction] };
    });
  }, []);

  const handleRemoveInstruction = useCallback((abstractId: string, instructionId: string) => {
    setInstructions((prev) => {
      const existing = prev[abstractId] ?? [];
      return { ...prev, [abstractId]: existing.filter((i) => i.id !== instructionId) };
    });
  }, []);

  const handleWrapInstruction = useCallback((abstractId: string, instructionId: string, kind: string) => {
    setInstructions((prev) => {
      const existing = prev[abstractId] ?? [];
      const target = existing.find((i) => i.id === instructionId);
      if (!target) return prev;

      const uid = `${Date.now()}-${instructionCounterRef.current++}`;
      let wrapper: MockInstruction;
      if (kind === 'choose') {
        wrapper = {
          id: `choose-${uid}`,
          kind: 'choose',
          children: [
            { id: `when-${uid}`, kind: 'when', children: [target] },
            { id: `otherwise-${uid}`, kind: 'otherwise' },
          ],
        };
      } else {
        wrapper = {
          id: `${kind}-${uid}`,
          kind: kind as MockInstruction['kind'],
          children: [target],
        };
      }
      return { ...prev, [abstractId]: existing.map((i) => (i.id === instructionId ? wrapper : i)) };
    });
  }, []);

  return (
    <AbstractTreeMock
      treeNode={args.mockData}
      substitutions={substitutions}
      onSelectSubstitute={handleSelectSubstitute}
      onClearSubstitution={handleClearSubstitution}
      onDuplicate={handleDuplicate}
      onRemoveInstance={handleRemoveInstance}
      instructions={instructions}
      onAddInstruction={handleAddInstruction}
      onRemoveInstruction={handleRemoveInstruction}
      onWrapInstruction={handleWrapInstruction}
      data-testid="abstract-tree-root"
    />
  );
};

export const SingleOccurrence: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>maxOccurs=1</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        Abstract fields render as regular field nodes with an <code>abstract</code> badge and candidate list. No
        children are rendered until the user selects a substitute via the right-click context menu.
      </p>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        When <code>maxOccurs=1</code>, selecting a substitute hides the abstract wrapper and renders the candidate
        directly as a regular field. Right-click the substituted field to &quot;Clear substitution&quot;.
      </p>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        <strong>Try it:</strong> Right-click AbstractLabel → &quot;Select substitute&quot; → pick Nickname. The wrapper
        disappears and Nickname renders directly. Right-click Nickname → &quot;Clear substitution&quot; to revert.
      </p>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}>
        <Template mockData={mockZooSingle} />
      </div>
    </div>
  );
};
SingleOccurrence.storyName = 'maxOccurs=1';

export const Collection: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>maxOccurs &gt; 1</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        When <code>maxOccurs &gt; 1</code> (collection), the abstract wrapper stays visible after substitution.
        Right-click to &quot;Select substitute&quot; or &quot;Duplicate&quot; for more instances. Each instance is
        independently substitutable.
      </p>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        Mapping instructions (for-each, choose-when-otherwise) are available via the 3-dot menu (&#8942;). The
        instruction wraps the abstract field — the abstract node renders inside it.
      </p>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        <strong>Try it:</strong> Right-click AbstractAnimal → &quot;Select substitute&quot; → pick Cat. Then right-click
        AbstractAnimal again → &quot;Duplicate&quot; to create an unsubstituted sibling. Or click &#8942; → &quot;Wrap
        with for-each&quot; to wrap it with an instruction.
      </p>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}>
        <Template mockData={mockZooCollection} />
      </div>
    </div>
  );
};
Collection.storyName = 'maxOccurs>1';

export const ManyCandidates: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Many Candidates</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        An abstract element with over 200 substitution candidates. The &quot;Select substitute&quot; modal includes a
        search/filter input to handle large candidate lists efficiently.
      </p>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        <strong>Try it:</strong> Right-click AbstractMessage → &quot;Select substitute&quot; → use the search input to
        filter through 200 candidates.
      </p>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}>
        <Template mockData={mockManyRoot} />
      </div>
    </div>
  );
};
ManyCandidates.storyName = 'Many Candidates';
