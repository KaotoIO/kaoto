import { ExpansionPanel, ExpansionPanels } from '@kaoto/kaoto/testing';
import { Meta, StoryFn } from '@storybook/react';
import { FunctionComponent } from 'react';

export default {
  title: 'Components/ExpansionPanels',
  component: ExpansionPanels,
} as Meta<typeof ExpansionPanels>;

const PanelHeader: FunctionComponent<{ title: string; count?: number }> = ({ title, count }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', cursor: 'pointer' }}>
    <span style={{ fontWeight: 600 }}>{title}</span>
    {count !== undefined && <span style={{ color: '#6a6e73' }}>({count})</span>}
  </div>
);

const PanelContent: FunctionComponent<{ items: string[] }> = ({ items }) => (
  <div style={{ padding: '8px 16px' }}>
    {items.map((item, index) => (
      <div
        key={'key' + index}
        style={{
          padding: '8px 12px',
          marginBottom: '4px',
          background: '#f0f0f0',
          borderRadius: '4px',
        }}
      >
        {item}
      </div>
    ))}
  </div>
);

const DataMapperLikeTemplate: StoryFn<typeof ExpansionPanels> = () => {
  // Generate realistic data (100+ items)
  const generateItems = (prefix: string, count: number) => Array.from({ length: count }, (_, i) => `${prefix}${i + 1}`);

  return (
    <div style={{ height: '600px', border: '1px solid #d2d2d2', borderRadius: '4px' }}>
      <ExpansionPanels firstPanelId="parameters-header" lastPanelId="source-body">
        <ExpansionPanel
          id="parameters-header"
          summary={<PanelHeader title="Parameters" count={5} />}
          defaultExpanded={true}
          defaultHeight={180}
          minHeight={80}
        >
          <PanelContent
            items={[
              'sourceType: string',
              'targetFormat: string',
              'encoding: string',
              'validateSchema: boolean',
              'prettyPrint: boolean',
            ]}
          />
        </ExpansionPanel>

        <ExpansionPanel
          id="non-collapsible"
          summary={<PanelHeader title="Non-collapsible-param" count={5} />}
          defaultExpanded={true}
          defaultHeight={180}
          minHeight={80}
          collapsible={false}
        >
          <PanelContent
            items={[
              'sourceType: string',
              'targetFormat: string',
              'encoding: string',
              'validateSchema: boolean',
              'prettyPrint: boolean',
            ]}
          />
        </ExpansionPanel>

        <ExpansionPanel
          id="source-body"
          summary={<PanelHeader title="Body" count={150} />}
          defaultExpanded={true}
          defaultHeight={400}
          minHeight={100}
        >
          <PanelContent items={generateItems('element', 150)} />
        </ExpansionPanel>
      </ExpansionPanels>
    </div>
  );
};

export const DataMapperLayout = DataMapperLikeTemplate.bind({});
DataMapperLayout.args = {};
