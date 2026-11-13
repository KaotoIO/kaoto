import {
  EntitiesContext,
  EntitiesContextResult,
  EntitiesProvider,
  inMemorySourceCodeAdapter,
  KaotoResourceProvider,
  Navigation,
  Shell,
  SourceCodeProvider,
  SourceSchemaType,
} from '@kaoto/kaoto/testing';
import { StoryFn } from '@storybook/react';
import { useMemo } from 'react';

export default {
  title: 'Navigation/Navigation',
  decorators: [
    (Story: StoryFn) => (
      <SourceCodeProvider adapter={inMemorySourceCodeAdapter()}>
        <KaotoResourceProvider>
          <EntitiesProvider>
            <Story />
          </EntitiesProvider>
        </KaotoResourceProvider>
      </SourceCodeProvider>
    ),
  ],
  component: Navigation,
};

const RouteNavigationTemplate: StoryFn<typeof Navigation> = () => {
  return <Navigation isNavOpen />;
};

const KameletNavigationTemplate: StoryFn<typeof Navigation> = () => {
  const value = useMemo(() => ({ currentSchemaType: SourceSchemaType.Kamelet }) as EntitiesContextResult, []);
  return (
    <EntitiesContext.Provider value={value}>
      <Navigation isNavOpen />
    </EntitiesContext.Provider>
  );
};

const PipeNavigationTemplate: StoryFn<typeof Navigation> = () => {
  const value = useMemo(() => ({ currentSchemaType: SourceSchemaType.Pipe }) as EntitiesContextResult, []);
  return (
    <EntitiesContext.Provider value={value}>
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
