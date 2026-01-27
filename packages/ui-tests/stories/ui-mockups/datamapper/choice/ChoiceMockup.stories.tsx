import { Label } from '@patternfly/react-core';
import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent, useState } from 'react';

import { ChoiceSelectionDialog } from './ChoiceSelectionDialog';
import { ChoiceToChoiceError } from './ChoiceToChoiceError';
import { ChoiceTreeMock } from './ChoiceTreeMock';
import { ConditionalMappingView } from './ConditionalMappingView';
import {
  getChoiceDisplayName,
  isChoiceNode,
  MockChoiceNode,
  mockContactInfoChoice,
  mockDirectNestedChoice,
  mockManyOptionsChoice,
  mockPersonWithMultipleChoices,
  MockTreeNode,
} from './mockSchemaData';

export default {
  title: 'UI Mockups/DataMapper/Choice Mockup',
  component: ChoiceTreeMock,
} as Meta<typeof ChoiceTreeMock>;

interface TemplateArgs {
  mockData: MockTreeNode;
  initialSelections?: Record<string, string>;
  dialogOpen?: boolean;
}

const Template: FunctionComponent<TemplateArgs> = (args) => {
  const [selections, setSelections] = useState<Record<string, string>>(args.initialSelections || {});
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; choiceNode: MockChoiceNode | null }>({
    isOpen: args.dialogOpen || false,
    choiceNode: args.dialogOpen && isChoiceNode(args.mockData) ? args.mockData : null,
  });

  const handleOpenDialog = (choiceId: string) => {
    const findChoiceNode = (node: MockTreeNode): MockChoiceNode | null => {
      if (isChoiceNode(node) && node.id === choiceId) {
        return node;
      }
      if (!isChoiceNode(node) && node.children) {
        for (const child of node.children) {
          const found = findChoiceNode(child);
          if (found) return found;
        }
      }
      if (isChoiceNode(node)) {
        for (const member of node.members) {
          const found = findChoiceNode(member);
          if (found) return found;
        }
      }
      return null;
    };

    const choiceNode = findChoiceNode(args.mockData);
    if (choiceNode) {
      setDialogState({ isOpen: true, choiceNode });
    }
  };

  const handleConfirmSelection = (selectedId: string) => {
    if (dialogState.choiceNode) {
      setSelections((prev) => ({
        ...prev,
        [dialogState.choiceNode!.id]: selectedId,
      }));
    }
    setDialogState({ isOpen: false, choiceNode: null });
  };

  const handleCloseDialog = () => {
    setDialogState({ isOpen: false, choiceNode: null });
  };

  const handleRevertChoice = (choiceId: string) => {
    setSelections((prev) => {
      const newSelections = { ...prev };
      delete newSelections[choiceId];
      return newSelections;
    });
  };

  return (
    <>
      <ChoiceTreeMock
        treeNode={args.mockData}
        selections={selections}
        onOpenDialog={handleOpenDialog}
        onRevertChoice={handleRevertChoice}
        data-testid="choice-tree-root"
      />
      {dialogState.isOpen && dialogState.choiceNode && (
        <ChoiceSelectionDialog
          isOpen={dialogState.isOpen}
          onClose={handleCloseDialog}
          onConfirm={handleConfirmSelection}
          choiceNode={dialogState.choiceNode}
          currentSelection={selections[dialogState.choiceNode.id]}
        />
      )}
    </>
  );
};

export const MainStory: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Choice Workflow</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        This story demonstrates the complete choice workflow in a realistic Person object context. The Person schema
        contains standard fields (firstName, lastName, age) plus three different types of choices: standard choice
        (contactInfo with 3 options), truncated choice (notificationChannel with{' '}
        {getChoiceDisplayName(mockManyOptionsChoice)}), and collection choice (preferredContactMethods with maxOccurs
        &gt; 1 indicated by layer icon).
      </p>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        <strong>Try it:</strong> Right-click any choice node to open the selection dialog, choose an option, then
        right-click the selected field to revert back to the choice.
      </p>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}>
        <Template mockData={mockPersonWithMultipleChoices} initialSelections={{}} dialogOpen={false} />
      </div>
    </div>
  );
};
MainStory.storyName = 'Main Story';

export const NestedChoices: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Nested Choices</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        When a choice has multiple choice members directly nested, they are numbered as choice1, choice2, etc. This
        parent choice shows: {getChoiceDisplayName(mockDirectNestedChoice)}
      </p>
      <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}>
        <Template mockData={mockDirectNestedChoice} initialSelections={{}} dialogOpen={false} />
      </div>
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <strong>Numbering Rules:</strong>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
          <li>Multiple choice members → choice1, choice2, etc.</li>
          <li>Single choice member → &ldquo;choice&rdquo; (no number)</li>
          <li>Regular field members → use displayName</li>
          <li>Truncation applied after numbering</li>
        </ul>
      </div>
    </div>
  );
};
NestedChoices.storyName = 'Nested Choices';

export const ConditionalMapping: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Conditional Mapping (choose-when-otherwise)</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        When a choice node is dragged from source to target, it generates a choose-when-otherwise structure with
        branches for each option. Each <code>when</code> branch has an XPath test expression to determine which path to
        execute.
      </p>
      <div
        style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
      >
        <ConditionalMappingView data-testid="conditional-mapping-view" />
      </div>
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
        <strong>Key Features:</strong>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
          <li>
            <Label isCompact color="grey">
              choose
            </Label>{' '}
            node contains conditional branches
          </li>
          <li>
            <Label isCompact color="grey">
              when
            </Label>{' '}
            nodes have XPath test expressions (editable via text input)
          </li>
          <li>
            <Label isCompact color="grey">
              otherwise
            </Label>{' '}
            provides fallback for unmatched cases
          </li>
          <li>Mapping lines show connections from source choice to target branches</li>
          <li>Target nodes include action menus for editing XPath, conditions, and deletion</li>
        </ul>
      </div>
    </div>
  );
};
ConditionalMapping.storyName = 'Conditional Mapping Result';

export const ChoiceToChoiceErrorStory: StoryFn = () => {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Choice to Choice Error</h2>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        Direct mapping from a choice node to another choice node is not allowed. When attempting to drag a source choice
        onto a target choice, an error is shown. Users should expand both choice nodes and map between specific members
        instead.
      </p>
      <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '800px' }}>
        <strong>Note:</strong> Dragging the source choice itself onto a target choice member would create
        choose/when/otherwise under that single member, which is likely not what you want. Both the source and target
        should be specific member fields.
      </p>
      <div
        style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '4px',
          border: '1px solid #ccc',
          position: 'relative',
          minHeight: '400px',
        }}
      >
        <ChoiceToChoiceError data-testid="choice-to-choice-error" />
      </div>
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <strong>Design Decision:</strong>
        <p style={{ marginTop: '0.5rem' }}>We prevent choice-to-choice mapping because:</p>
        <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
          <li>An unresolved choice cannot generate valid XSLT (both source and target must be concrete elements)</li>
          <li>
            Dragging source choice → target choice member would create choose/when/otherwise under a single target
            member (likely not intended)
          </li>
        </ul>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Valid mapping scenarios when both are choice nodes:</strong>
        </p>
        <ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
          <li>
            ✓ <strong>Source member → Target member:</strong> Expand both choices, drag email → sms (direct 1:1 mapping)
          </li>
          <li>
            ✗ <strong>Source choice → Target choice:</strong> Creates invalid XSLT with unresolved choices
          </li>
          <li>
            ✗ <strong>Source choice → Target member:</strong> Creates choose/when under one target member (usually
            unwanted)
          </li>
        </ul>
        <p style={{ marginTop: '0.5rem' }}>
          <strong>Future enhancement:</strong> A selection dialog could allow mapping each source option to a specific
          target option upfront, generating fully resolved conditional mapping in one step. cf.
          <a href="https://github.com/KaotoIO/kaoto/issues/2763">https://github.com/KaotoIO/kaoto/issues/2763</a>
        </p>
      </div>
    </div>
  );
};
ChoiceToChoiceErrorStory.storyName = 'Choice to Choice Error';
