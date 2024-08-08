import { Navigation, Shell, SourceCodeProvider } from '@kaoto/kaoto/testing';
import { StoryFn } from '@storybook/react';
import { withRouter, reactRouterOutlet, reactRouterParameters } from 'storybook-addon-remix-react-router';

export default {
  title: 'Navigation/Navigation',
  decorators: [withRouter],
  parameters: {
    reactRouter: reactRouterParameters({
      routing: reactRouterOutlet({
        path: '*',
      }),
    }),
  },
  component: Navigation,
};

const NavigationTemplate: StoryFn<typeof Navigation> = () => {
  return <Navigation isNavOpen={true} />;
};

const ShellTemplate: StoryFn<typeof Shell> = () => {
  return (
    <SourceCodeProvider>
      <Shell />
    </SourceCodeProvider>
  );
};

export const NavigationOpen = NavigationTemplate.bind({});

export const NavigationWithTopBar = ShellTemplate.bind({});
