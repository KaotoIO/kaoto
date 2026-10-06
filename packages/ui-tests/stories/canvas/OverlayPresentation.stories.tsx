import { OverlayPresentationDemo } from '@kaoto/kaoto/testing';
import { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';

const ThemedGallery = ({ dark = false }: { dark?: boolean }) => {
  useEffect(() => {
    const root = document.documentElement;
    const previousDark = root.classList.contains('pf-v6-theme-dark');
    const previousSetting = root.getAttribute('data-theme-setting');
    root.classList.toggle('pf-v6-theme-dark', dark);
    root.setAttribute('data-theme-setting', dark ? 'dark' : 'light');
    return () => {
      root.classList.toggle('pf-v6-theme-dark', previousDark);
      if (previousSetting === null) root.removeAttribute('data-theme-setting');
      else root.setAttribute('data-theme-setting', previousSetting);
    };
  }, [dark]);
  return <OverlayPresentationDemo />;
};

export default {
  title: 'Canvas/Overlay presentation',
  component: ThemedGallery,
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ThemedGallery>;

type Story = StoryObj<typeof ThemedGallery>;
export const Light: Story = { args: { dark: false } };
export const Dark: Story = { args: { dark: true } };
