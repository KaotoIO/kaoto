import { Meta, StoryFn } from '@storybook/react';

import { ResizableSplitPanels } from '../../../ui/src/components/ResizableSplitPanels';

export default {
  title: 'Components/ResizableSplitPanels',
  component: ResizableSplitPanels,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    defaultLeftWidth: {
      control: { type: 'range', min: 10, max: 90, step: 5 },
      description: 'Default width percentage for the left panel (10-90)',
    },
  },
} as Meta<typeof ResizableSplitPanels>;

const Template: StoryFn<typeof ResizableSplitPanels> = (args) => (
  <div style={{ height: '600px' }}>
    <ResizableSplitPanels {...args} />
  </div>
);

// Default - Basic two-panel layout
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

// Equal Split - 50/50 layout
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

// With Scrollable Content
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
