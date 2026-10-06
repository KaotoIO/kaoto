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
  const stepAnnotations = canvasElement.querySelectorAll('.kaoto-overlay-demo__step-annotation');
  await expect(stepAnnotations.length).toBeGreaterThan(0);
  for (const anchor of stepAnnotations) {
    const annotation = anchor.querySelector('.kaoto-overlay-annotation')!;
    const bounds = annotation.getBoundingClientRect();
    const node = anchor.parentElement!.querySelector('.custom-node__container')!.getBoundingClientRect();
    await expect(bounds.bottom).toBeLessThan(node.top);
    for (const badge of anchor.parentElement!.querySelectorAll('.step-icon')) {
      await expect(bounds.bottom).toBeLessThan(badge.getBoundingClientRect().top);
    }
    if (anchor.classList.contains('kaoto-overlay-demo__step-annotation--vertical')) {
      // The incoming edge is centered on this node; leave its path and arrowhead clear.
      await expect(bounds.left).toBeGreaterThan(node.x + node.width / 2 + 4);
    } else {
      await expect(Math.abs(bounds.x + bounds.width / 2 - node.x - node.width / 2)).toBeLessThan(0.1);
    }
    const text = annotation.querySelector('.kaoto-overlay-text')!;
    await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
  }

  const edge = canvasElement.querySelector('.kaoto-overlay-demo__edge')!.getBoundingClientRect();
  const edgeAnnotation = canvasElement.querySelector('.kaoto-overlay-demo__edge-annotation .kaoto-overlay-annotation')!;
  const edgeText = edgeAnnotation.querySelector('.kaoto-overlay-text')!;
  const originalText = edgeText.textContent;
  try {
    for (const text of [originalText, '1 ms', 'A much longer annotation that must remain centered above its edge']) {
      edgeText.textContent = text;
      const bounds = edgeAnnotation.getBoundingClientRect();
      await expect(Math.abs(bounds.x + bounds.width / 2 - edge.x - edge.width / 2)).toBeLessThan(0.1);
      await expect(bounds.bottom).toBeLessThan(edge.top);
    }
  } finally {
    edgeText.textContent = originalText;
  }

  const route = canvasElement.querySelector('.kaoto-overlay-demo__route')!;
  const routeBackground = getComputedStyle(route).fill;
  for (const emphasis of ['normal', 'strong', 'subdued']) {
    const annotation = canvasElement.querySelector(`[aria-label="warning ${emphasis} annotation: Count 42"]`)!;
    const style = getComputedStyle(annotation);
    // Check annotation text and its emphasis border on both demo surfaces.
    await expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
    await expect(contrast(style.borderTopColor, style.backgroundColor)).toBeGreaterThanOrEqual(3);
    await expect(contrast(style.borderTopColor, routeBackground)).toBeGreaterThanOrEqual(3);
  }
};

Light.play = verifyPresentation;
Dark.play = verifyPresentation;
