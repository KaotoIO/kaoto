import { OverlayPresentationDemo } from '@kaoto/kaoto/testing';
import { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { expect } from 'storybook/test';

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

const luminance = (color: string) => {
  const channels = color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number)
    .map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
};

const verifyPresentation: Story['play'] = async ({ canvasElement }) => {
  // Include transformed SVG examples: text line boxes must not shift the visible marker.
  for (const marker of canvasElement.querySelectorAll('.kaoto-overlay-marker')) {
    const hitArea = marker.getBoundingClientRect();
    const frame = marker.querySelector('.kaoto-overlay-icon')!.getBoundingClientRect();
    const glyph = marker.querySelector('svg')!.getBoundingClientRect();
    for (const bounds of [frame, glyph]) {
      await expect(Math.abs(bounds.x + bounds.width / 2 - hitArea.x - hitArea.width / 2)).toBeLessThan(0.1);
      await expect(Math.abs(bounds.y + bounds.height / 2 - hitArea.y - hitArea.height / 2)).toBeLessThan(0.1);
    }
  }

  const route = canvasElement.querySelector('.kaoto-overlay-demo__route')!;
  const routeBackground = getComputedStyle(route).fill;
  for (const emphasis of ['normal', 'strong', 'subdued']) {
    const marker = canvasElement.querySelector(`[aria-label="warning ${emphasis}"]`)!;
    const style = getComputedStyle(marker.querySelector('.kaoto-overlay-icon')!);
    // Both glyph/border and SVG highlight use this foreground. Check both demo surfaces.
    await expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(3);
    await expect(contrast(style.borderTopColor, style.backgroundColor)).toBeGreaterThanOrEqual(3);
    await expect(contrast(style.color, routeBackground)).toBeGreaterThanOrEqual(3);
  }
};

Light.play = verifyPresentation;
Dark.play = verifyPresentation;
