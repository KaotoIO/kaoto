import { SuggestionRegistryProvider } from '@kaoto/forms';
import '@patternfly/patternfly/patternfly.css';
import '@patternfly/patternfly/utilities/Accessibility/accessibility.css';
import '@patternfly/patternfly/utilities/Display/display.css';
import '@patternfly/patternfly/utilities/Flex/flex.css';
import '@patternfly/patternfly/utilities/Sizing/sizing.css';
import '@patternfly/patternfly/utilities/Spacing/spacing.css';

import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '100%' }}>
        {/* 👇 Decorators in Storybook also accept a function. Replace <Story/> with Story() to enable it  */}
        <SuggestionRegistryProvider>
          <Story />
        </SuggestionRegistryProvider>
      </div>
    ),
  ],
};

export default preview;
