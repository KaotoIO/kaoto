import type { Meta, StoryFn } from '@storybook/react';
import { CSSProperties } from 'react';

import { ForEachGroupMockup } from './ForEachGroupMockup';

export default {
  title: 'UI Mockups/DataMapper/ForEachGroup',
  component: ForEachGroupMockup,
} as Meta<typeof ForEachGroupMockup>;

const STORY_WRAPPER: CSSProperties = { padding: '2rem', backgroundColor: '#f5f5f5' };
const STORY_TITLE: CSSProperties = { marginBottom: '0.5rem' };
const STORY_DESC: CSSProperties = { marginBottom: '1rem', color: '#666', maxWidth: '900px' };
const STORY_COMPONENT_BOX: CSSProperties = {
  backgroundColor: 'white',
  padding: '1.5rem',
  borderRadius: '4px',
  border: '1px solid #ccc',
};

export const WorkflowOverview: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>for-each-group Support — Workflow Overview</h2>
    <p>
      Issue: <a href="https://github.com/KaotoIO/kaoto/issues/2321">https://github.com/KaotoIO/kaoto/issues/2321</a>
    </p>
    <br />
    <p style={{ ...STORY_DESC, marginBottom: '0.5rem' }}>
      <strong>Scenario:</strong> group a source collection of <code>Item</code> elements by <code>Category</code> using
      <code>xsl:for-each-group</code>, then iterate over each group&apos;s items with{' '}
      <code>for-each current-group()</code> to map individual fields.
    </p>
    <ol style={{ marginBottom: '1rem', color: '#666', maxWidth: '900px', paddingLeft: '1.5rem' }}>
      <li>
        <strong>Wrap with for-each-group</strong> — open the 3-dots context menu on the <code>Item</code> collection
        field and choose <em>Wrap with for-each-group</em>.
      </li>
      <li>
        <strong>Configure grouping</strong> — the modal opens automatically; select a grouping strategy (e.g.{' '}
        <em>Group By</em>) and enter the grouping XPath expression (e.g. <code>Category</code>).
      </li>
      <li>
        <strong>Set select expression</strong> — fill in the <code>select</code> inline input on the{' '}
        <code>for-each-group</code> node (e.g. <code>$cart/ns0:Cart/Item</code>). Hover the label to inspect the
        configured strategy and expression at any time.
      </li>
      <li>
        <strong>Reconfigure if needed</strong> — open the 3-dots context menu on <code>for-each-group</code> and choose{' '}
        <em>Configure grouping</em> to reopen the modal pre-populated with the current values.
      </li>
      <li>
        <strong>Wrap with for-each current-group()</strong> — inside the <code>for-each-group</code>, open the 3-dots
        context menu on <code>Item</code> and choose <em>Wrap with for-each current-group()</em>. The{' '}
        <code>select</code> expression is set to <code>current-group()</code> automatically.
      </li>
      <li>
        <strong>Map child fields</strong> — expand <code>Item</code> inside the inner <code>for-each</code> and map{' '}
        <code>Title</code> and <code>Quantity</code> to their XPath expressions.
      </li>
    </ol>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup
        phase="configured"
        selectExpression="$cart/ns0:Cart/Item"
        groupingStrategy="group-by"
        groupingExpression="Category"
        showInnerForEach
      />
    </div>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
      <strong>Design decisions:</strong>
      <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
        <li>
          Grouping strategy and expression are configured in a <strong>modal</strong> (not an inline node) — keeps the
          tree uncluttered and groups related inputs together.
        </li>
        <li>
          The modal auto-opens on wrap so the user is guided immediately; it can be reopened later via the 3-dots
          context menu.
        </li>
        <li>
          A <strong>tooltip on the label</strong> summarises the current strategy and expression without requiring the
          modal to be reopened.
        </li>
        <li>
          <strong>&ldquo;Wrap with for-each current-group()&rdquo;</strong> is only offered on collection fields that
          are direct children of a <code>for-each-group</code> node — scoped to avoid misuse.
        </li>
        <li>Deletion uses the trash icon button, consistent with all other mapping nodes in the tree.</li>
      </ul>
    </div>
  </div>
);
WorkflowOverview.storyName = 'Workflow Overview';

export const Step1_CollectionFieldMenu: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>Step 1 — Wrap a collection field with for-each-group</h2>
    <p style={STORY_DESC}>
      Open the 3-dots context menu on the <code>Item</code> collection field in the target document tree. In addition to
      the existing wrapping options, a new <strong>&ldquo;Wrap with for-each-group&rdquo;</strong> item appears.
      Selecting it wraps the field and immediately opens the grouping configuration modal (Step 2).
    </p>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup phase="before-wrap" outerMenuOpen />
    </div>
  </div>
);
Step1_CollectionFieldMenu.storyName = 'Step 1: Collection field — 3-dot menu with "Wrap with for-each-group"';

export const Step2_GroupingModal: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>Step 2 — Configure the grouping strategy</h2>
    <p style={STORY_DESC}>
      Immediately after wrapping, the <strong>Configure for-each-group</strong> modal opens automatically. The user
      selects one of the four grouping strategies and enters the grouping XPath expression. &ldquo;Group By&rdquo; is
      pre-selected as the default. The <code>select</code> expression on the node itself is filled in separately via the
      inline text input after the modal is closed.
    </p>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup
        phase="configured"
        selectExpression=""
        groupingStrategy="group-by"
        groupingExpression=""
        modalOpen
      />
    </div>
  </div>
);
Step2_GroupingModal.storyName = 'Step 2: Grouping configuration modal — auto-opens after "Wrap with for-each-group"';

export const Step3_LabelTooltip: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>Step 3 — for-each-group node in the tree</h2>
    <p style={STORY_DESC}>
      After saving the modal, the <code>for-each-group</code> node appears in the tree with the wrapped{' '}
      <strong>Item</strong> field as its child. The inline text input lets the user set the <code>select</code>{' '}
      expression. <strong>Hover over the label</strong> to see a tooltip summarising the current grouping configuration
      (strategy and expression), so the user can inspect the setup without reopening the modal.
    </p>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup
        phase="configured"
        selectExpression="$cart/ns0:Cart/Item"
        groupingStrategy="group-by"
        groupingExpression="Category"
      />
    </div>
  </div>
);
Step3_LabelTooltip.storyName = 'Step 3: for-each-group label — hover to see tooltip with strategy and expression';

export const Step4_ForEachGroupMenu: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>Step 4 — Reconfigure via the 3-dot menu</h2>
    <p style={STORY_DESC}>
      The 3-dots context menu on the <code>for-each-group</code> node exposes{' '}
      <strong>&ldquo;Configure grouping&rdquo;</strong> to reopen the configuration modal. Deletion is handled by the
      trash icon button next to the menu — consistent with how other mapping nodes are deleted in the tree.
    </p>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup
        phase="configured"
        selectExpression="$cart/ns0:Cart/Item"
        groupingStrategy="group-by"
        groupingExpression="Category"
        forEachGroupMenuOpen
      />
    </div>
  </div>
);
Step4_ForEachGroupMenu.storyName = 'Step 4: for-each-group 3-dot menu — "Configure grouping" reopens modal';

export const Step5_ReconfigureModal: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>Step 5 — Reconfigure grouping</h2>
    <p style={STORY_DESC}>
      When the user clicks &ldquo;Configure grouping&rdquo;, the modal reopens pre-populated with the previously saved
      strategy and expression. The user can switch to a different strategy or update the grouping expression, then save
      to apply the changes.
    </p>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup
        phase="configured"
        selectExpression="$cart/ns0:Cart/Item"
        groupingStrategy="group-by"
        groupingExpression="Category"
        modalOpen
      />
    </div>
  </div>
);
Step5_ReconfigureModal.storyName = 'Step 5: Reconfigure — modal pre-populated with existing strategy and expression';

export const Step6_InnerForEachMenu: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>Step 6 — Wrap Item with for-each current-group()</h2>
    <p style={STORY_DESC}>
      Inside the <code>for-each-group</code>, the user opens the 3-dots context menu on the wrapped{' '}
      <strong>Item</strong> collection field. A new <strong>&ldquo;Wrap with for-each current-group()&rdquo;</strong>{' '}
      option appears. Selecting it wraps Item with a <code>for-each</code> whose <code>select</code> expression is
      automatically set to <code>current-group()</code> — a scoped XSLT 2.0 function that iterates over the items in the
      current group.
    </p>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup
        phase="configured"
        selectExpression="$cart/ns0:Cart/Item"
        groupingStrategy="group-by"
        groupingExpression="Category"
        innerMenuOpen
      />
    </div>
  </div>
);
Step6_InnerForEachMenu.storyName = 'Step 6: Inside for-each-group — "Wrap with for-each current-group()"';

export const Step7_Complete: StoryFn = () => (
  <div style={STORY_WRAPPER}>
    <h2 style={STORY_TITLE}>Step 7 — Complete mapping structure</h2>
    <p style={STORY_DESC}>
      The fully configured structure. <code>for-each-group</code> iterates over the source collection and groups items
      by the configured expression. Inside it, <code>for-each current-group()</code> iterates over each group&apos;s
      items, and the user maps individual fields (Title, Quantity) from the expanded Item node. The generated XSLT uses{' '}
      <code>xsl:for-each-group</code> with the chosen strategy attribute (e.g. <code>{'group-by="Category"'}</code>).
    </p>
    <div style={STORY_COMPONENT_BOX}>
      <ForEachGroupMockup
        phase="configured"
        selectExpression="$cart/ns0:Cart/Item"
        groupingStrategy="group-by"
        groupingExpression="Category"
        showInnerForEach
      />
    </div>
  </div>
);
Step7_Complete.storyName = 'Step 7: Complete — for-each-group → for-each(current-group()) → child fields';
