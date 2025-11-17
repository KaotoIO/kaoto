import {
  EntitiesContext,
  EntitiesContextResult,
  EntitiesProvider,
  Navigation,
  Shell,
  SourceCodeProvider,
  SourceSchemaType,
} from '@kaoto/kaoto/testing';
import { StoryFn } from '@storybook/react';
import { reactRouterOutlet, reactRouterParameters, withRouter } from 'storybook-addon-remix-react-router';

export default {
  title: 'Navigation/Navigation',
  decorators: [
    withRouter,
    (Story: StoryFn) => (
      <EntitiesProvider>
        <SourceCodeProvider>
          <Story />
        </SourceCodeProvider>
      </EntitiesProvider>
    ),
  ],
  parameters: {
    reactRouter: reactRouterParameters({
      routing: reactRouterOutlet({
        path: '*',
      }),
    }),
  },
  component: Navigation,
};

const RouteNavigationTemplate: StoryFn<typeof Navigation> = () => {
  return <Navigation isNavOpen />;
};

const KameletNavigationTemplate: StoryFn<typeof Navigation> = () => {
  return (
    <EntitiesContext.Provider value={{ currentSchemaType: SourceSchemaType.Kamelet } as EntitiesContextResult}>
      <Navigation isNavOpen />
    </EntitiesContext.Provider>
  );
};

const PipeNavigationTemplate: StoryFn<typeof Navigation> = () => {
  return (
    <EntitiesContext.Provider value={{ currentSchemaType: SourceSchemaType.Pipe } as EntitiesContextResult}>
      <Navigation isNavOpen />
    </EntitiesContext.Provider>
  );
};

const ShellTemplate: StoryFn<typeof Shell> = () => {
  return <Shell />;
};

export const RouteNavigationOpen = RouteNavigationTemplate.bind({});
export const KameletNavigationOpen = KameletNavigationTemplate.bind({});
export const PipeNavigationOpen = PipeNavigationTemplate.bind({});

export const NavigationWithTopBar = ShellTemplate.bind({});
