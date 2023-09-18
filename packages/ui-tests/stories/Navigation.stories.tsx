import { Navigation, Shell } from '@kaoto-next/ui/testing';
import { StoryFn } from '@storybook/react';
import { withRouter, reactRouterOutlet, reactRouterParameters } from 'storybook-addon-react-router-v6';

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
  return <Shell />;
};

export const NavigationOpen = NavigationTemplate.bind({});

export const NavigationWithTopBar = ShellTemplate.bind({});
