import { Meta, StoryFn } from '@storybook/react';

import { ResizableSplitPanels } from '../../../ui/src/components/ResizableSplitPanels';

export default {
  title: 'Components/ResizableSplitPanels',
  component: ResizableSplitPanels,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
ResizableSplitPanels provides a two-panel layout with a draggable resize handle.

## Accessibility Features

- **Keyboard accessible**: Use arrow keys to resize panels, Tab to focus the handle
- **Screen reader support**: Proper ARIA labels and live region announcements
- **Focus visible**: Clear focus indicators for keyboard navigation

Supports mouse drag and keyboard resize with Home/End for min/max widths.
        `,
      },
    },
  },
  argTypes: {
    defaultLeftWidth: {
      control: { type: 'range', min: 10, max: 90, step: 5 },
      description: 'Default width percentage for the left panel (10-90)',
    },
    leftPanelId: {
      control: 'text',
      description: 'Custom ID for the left panel',
    },
    rightPanelId: {
      control: 'text',
      description: 'Custom ID for the right panel',
    },
    leftPanelLabel: {
      control: 'text',
      description: 'Custom aria-label for the left panel',
    },
    rightPanelLabel: {
      control: 'text',
      description: 'Custom aria-label for the right panel',
    },
  },
} as Meta<typeof ResizableSplitPanels>;

const Template: StoryFn<typeof ResizableSplitPanels> = (args) => (
  <div style={{ height: '600px' }}>
    <ResizableSplitPanels {...args} />
  </div>
);

export const Default = Template.bind({});
Default.args = {
  leftPanel: (
    <div style={{ padding: '1rem' }}>
      <h3>Left Panel</h3>
      <p>Drag the resize handle between panels to adjust their widths.</p>
      <p>Both panels maintain their content independently and support scrolling when content overflows.</p>
    </div>
  ),
  rightPanel: (
    <div style={{ padding: '1rem' }}>
      <h3>Right Panel</h3>
      <p>The panels use percentage-based widths for responsive behavior.</p>
      <p>Minimum width for each panel is 10% to ensure usability.</p>
    </div>
  ),
  defaultLeftWidth: 30,
};

export const EqualSplit = Template.bind({});
EqualSplit.args = {
  leftPanel: (
    <div style={{ padding: '1rem' }}>
      <h3>Left Panel (50%)</h3>
      <p>Equal split layout with both panels at 50% width.</p>
    </div>
  ),
  rightPanel: (
    <div style={{ padding: '1rem' }}>
      <h3>Right Panel (50%)</h3>
      <p>Useful for side-by-side comparison or dual-pane interfaces.</p>
    </div>
  ),
  defaultLeftWidth: 50,
};

export const WithScrollableContent = Template.bind({});
WithScrollableContent.args = {
  leftPanel: (
    <div style={{ padding: '1rem' }}>
      <h3>Scrollable Content</h3>
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>Line {i + 1}: Each panel handles overflow independently with scrolling.</p>
      ))}
    </div>
  ),
  rightPanel: (
    <div style={{ padding: '1rem' }}>
      <h3>Independent Scrolling</h3>
      {Array.from({ length: 30 }, (_, i) => (
        <p key={i}>Line {i + 1}: Scrolling in one panel does not affect the other.</p>
      ))}
    </div>
  ),
  defaultLeftWidth: 50,
};

// Made with Bob
