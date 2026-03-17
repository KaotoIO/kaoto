import { Meta, StoryFn } from '@storybook/react';

import { VariableMockup } from './VariableMockup';

export default {
  title: 'UI Mockups/DataMapper/Variable',
  component: VariableMockup,
} as Meta<typeof VariableMockup>;

export const WorkflowOverview: StoryFn = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
    <h2 style={{ marginBottom: '0.5rem' }}>Variable Support — Workflow Overview</h2>
    <p>
      Issue: <a href="https://github.com/KaotoIO/kaoto/issues/2362">https://github.com/KaotoIO/kaoto/issues/2362</a>
    </p>
    <br />
    <p style={{ marginBottom: '0.5rem', color: '#666', maxWidth: '900px' }}>
      <strong>Scenario:</strong> the source has an <code>Orders</code> collection parameter. The target{' '}
      <code>Invoice</code> document has a <code>Subtotals</code> collection field wrapped with{' '}
      <code>for-each ($Orders/Order)</code>. Inside the loop, <code>$taxAmount</code> captures the per-item tax so it
      can be reused in the <code>Subtotal</code> expression without duplicating the calculation.
    </p>
    <ol style={{ marginBottom: '1rem', color: '#666', maxWidth: '900px', paddingLeft: '1.5rem' }}>
      <li>
        <strong>Add variable</strong> — open the 3-dots context menu on the <code>for-each</code> node and choose{' '}
        <strong>Add Variable…</strong>.
      </li>
      <li>
        <strong>Map source field → variable</strong> — drag <code>Price</code> onto <code>$taxAmount</code>. The XPath
        expression is prefilled with <code>Price</code>; extend it to <code>Price * 0.1</code>.
      </li>
      <li>
        <strong>Map to Subtotal</strong> — drag both <code>Price</code> and <code>$taxAmount</code> onto{' '}
        <code>Subtotal</code>. Make the expression to be <code>Price + $taxAmount</code>.
      </li>
    </ol>
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
      <VariableMockup step={4} />
    </div>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
      <strong>Design decisions:</strong>
      <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
        <li>
          Source panel order: <strong>Variables → Parameters → Source Body</strong>
        </li>
        <li>
          Variable label: compact <strong>$</strong> badge + plain name (consistent with <code>choose</code>/
          <code>when</code> control-flow badges)
        </li>
        <li>
          Variables are scoped to the <code>for-each</code> block — &quot;Add Variable…&quot; is in the{' '}
          <code>for-each</code> ⋮ menu
        </li>
        <li>Pencil icon = XPath editor; rename is in the ⋮ menu only</li>
        <li>Source variables are draggable (flat list, no scope grouping)</li>
      </ul>
    </div>
  </div>
);
WorkflowOverview.storyName = 'Workflow Overview';

export const StepOneAddVariable: StoryFn = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
    <h2 style={{ marginBottom: '0.5rem' }}>Step 1 — Add Variable</h2>
    <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '900px' }}>
      The <code>for-each ($Orders/Order)</code> block is already defined under <code>Subtotals</code>. Open the 3-dots
      context menu on the <code>for-each</code> node and choose <strong>Add Variable…</strong>. An inline name input
      appears inside the <code>for-each</code> block. Type <code>taxAmount</code> and click <strong>✓</strong> to
      confirm. The input validates in real-time: must be a valid QName. Click <strong>✕</strong> to cancel. Once the
      variable is created, it appears in <strong>Variables</strong> section in the Source Panel.
    </p>
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
      <VariableMockup step={1} />
    </div>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
      <strong>Interaction pattern:</strong>
      <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
        <li>Same inline input pattern as Parameters — no modal dialog</li>
        <li>Auto-focused on open</li>
        <li>
          Valid: <code>taxAmount</code>, <code>item_total</code>, <code>v1</code>
        </li>
        <li>
          Invalid: <code>1rate</code>, <code>tax amount</code>, <code>tax@rate</code>
        </li>
      </ul>
    </div>
  </div>
);
StepOneAddVariable.storyName = 'Step 1 — Add Variable';

export const StepTwoRenameVariable: StoryFn = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
    <h2 style={{ marginBottom: '0.5rem' }}>Step 2 — Rename Variable</h2>
    <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '900px' }}>
      After the variable is created, it can be renamed at any time. Open the 3-dots context menu on the{' '}
      <code>$taxAmount</code> variable node in the target tree and choose <strong>Rename variable…</strong>. The
      variable name becomes an inline input pre-filled with the current name. Edit the name and click <strong>✓</strong>{' '}
      to confirm, or <strong>✕</strong> to cancel. The new name is reflected immediately in both the target tree and the
      source <strong>Variables</strong> section.
    </p>
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
      <VariableMockup step={2} />
    </div>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
      <strong>Interaction pattern:</strong>
      <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
        <li>Same inline input as creation — pre-filled with current name</li>
        <li>Auto-focused and fully selected on open</li>
        <li>Validation identical to creation: must be a valid QName</li>
        <li>Rename updates both the target node and the source Variables entry atomically</li>
      </ul>
    </div>
  </div>
);
StepTwoRenameVariable.storyName = 'Step 2 — Rename Variable';

export const StepThreeMapToVariable: StoryFn = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
    <h2 style={{ marginBottom: '0.5rem' }}>Step 3 — Map Source Field to Variable</h2>
    <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '900px' }}>
      Drag <code>Price</code> from the <code>Orders</code> parameter onto the <code>$taxAmount</code> variable node. The
      XPath expression is pre-filled with <code>Price</code> (relative to the current loop item). The user extends it to{' '}
      <code>Price * 0.1</code>.
    </p>
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
      <VariableMockup step={3} />
    </div>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
      <strong>Result:</strong> <code>$taxAmount</code> expression = <code>Price * 0.1</code>. The variable is scoped to
      the <code>for-each</code> iteration and ready to be used in the <code>Subtotal</code> mapping.
    </div>
  </div>
);
StepThreeMapToVariable.storyName = 'Step 3 — Map Field to Variable';

export const StepFourMapVariableToField: StoryFn = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
    <h2 style={{ marginBottom: '0.5rem' }}>Step 4 — Map from Variable</h2>
    <p style={{ marginBottom: '1rem', color: '#666', maxWidth: '900px' }}>
      Drag <code>Price</code> and <code>$taxAmount</code> from the source panel onto <code>Subtotal</code>. Make the
      expression to be <code>Price + $taxAmount</code>. The tax is computed once per iteration via the variable and
      reused — no need to duplicate <code>Price * 0.1</code> inline.
    </p>
    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
      <VariableMockup step={4} />
    </div>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
      <strong>Result:</strong> <code>Subtotal</code> = <code>Price + $taxAmount</code>. For each order in{' '}
      <code>$Orders/Order</code>, one <code>Subtotal</code> element is emitted with the correct value.
    </div>
  </div>
);
StepFourMapVariableToField.storyName = 'Step 4 — Map from Variable';
