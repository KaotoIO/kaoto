import { OverlayPresentationDemo } from '@kaoto/kaoto/testing';
import { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

const ThemedGallery = ({ dark = false }: { dark?: boolean }) => {
  useEffect(() => {
    const root = document.documentElement;
    const previousDark = root.classList.contains('pf-v6-theme-dark');
    const previousSetting = root.dataset.themeSetting;
    root.classList.toggle('pf-v6-theme-dark', dark);
    root.dataset.themeSetting = dark ? 'dark' : 'light';
    return () => {
      root.classList.toggle('pf-v6-theme-dark', previousDark);
      if (previousSetting === undefined) delete root.dataset.themeSetting;
      else root.dataset.themeSetting = previousSetting;
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
  const mainRoute = canvasElement.querySelector('[data-demo-group="route-1837"]')!;
  await waitFor(() => expect(mainRoute.querySelectorAll('path.kaoto-overlay')).toHaveLength(4));
  const choice = mainRoute.querySelector('[data-demo-group="choice-1601"]')!;
  await expect(choice.querySelector('[data-demo-group="when-2399"]')).not.toBeNull();
  await expect(choice.querySelector('[data-demo-group="otherwise-3621"]')).not.toBeNull();
  await Promise.all(
    ['from-1199', 'to-1402', 'to-2430'].map((id) =>
      expect(mainRoute.querySelector(`[data-demo-node="${id}"] rect.kaoto-overlay-tone-info`)).not.toBeNull(),
    ),
  );
  await expect(mainRoute.querySelector('[data-demo-node="to-3904"] rect.kaoto-overlay')).toBeNull();
  await expect(mainRoute.querySelector('[aria-label="to-3904 message count: 0"]')).not.toBeNull();
  await expect(mainRoute.querySelectorAll('path.kaoto-overlay-tone-info')).toHaveLength(4);
  await Promise.all(
    ['otherwise-3621-to-3904', 'to-3904-choice-exit'].map((id) =>
      expect(mainRoute.querySelector(`[data-demo-edge="${id}"] path.kaoto-overlay`)).toBeNull(),
    ),
  );

  const stepAnnotations = canvasElement.querySelectorAll('.kaoto-overlay-demo__step-annotation');
  await expect(stepAnnotations.length).toBeGreaterThan(0);
  await Promise.all(
    Array.from(stepAnnotations, async (anchor) => {
      const annotation = anchor.querySelector('.kaoto-overlay-annotation')!;
      const bounds = annotation.getBoundingClientRect();
      const node = anchor.parentElement!.querySelector('.custom-node__container')!.getBoundingClientRect();
      await expect(bounds.bottom).toBeLessThan(node.top);
      await Promise.all(
        Array.from(anchor.parentElement!.querySelectorAll('.step-icon'), (badge) =>
          expect(bounds.bottom).toBeLessThan(badge.getBoundingClientRect().top),
        ),
      );
      if (anchor.classList.contains('kaoto-overlay-demo__step-annotation--vertical')) {
        // The incoming edge is centered on this node; leave its path and arrowhead clear.
        await expect(bounds.left).toBeGreaterThan(node.x + node.width / 2 + 4);
      } else {
        await expect(Math.abs(bounds.x + bounds.width / 2 - node.x - node.width / 2)).toBeLessThan(0.1);
      }
      const text = annotation.querySelector('.kaoto-overlay-text')!;
      await expect(text.scrollWidth).toBeLessThanOrEqual(text.clientWidth);
    }),
  );

  const edge = canvasElement
    .querySelector('[data-demo-edge="from-1199-choice-1601"] .kaoto-overlay-demo__edge')!
    .getBoundingClientRect();
  const edgeAnnotation = canvasElement.querySelector('.kaoto-overlay-demo__edge-annotation .kaoto-overlay-annotation')!;
  const edgeText = edgeAnnotation.querySelector('.kaoto-overlay-text')!;
  const originalText = edgeText.textContent;
  const verifyEdgeText = async (text: string | null) => {
    edgeText.textContent = text;
    const bounds = edgeAnnotation.getBoundingClientRect();
    await expect(Math.abs(bounds.x + bounds.width / 2 - edge.x - edge.width / 2)).toBeLessThan(0.1);
    await expect(bounds.bottom).toBeLessThan(edge.top);
  };
  try {
    // These cases mutate the same element, so finish each check before changing its text.
    await verifyEdgeText(originalText);
    await verifyEdgeText('1 ms');
    await verifyEdgeText('A much longer annotation that must remain centered above its edge');
  } finally {
    edgeText.textContent = originalText;
  }

  const route = canvasElement.querySelector('.kaoto-overlay-demo__route')!;
  const routeBackground = getComputedStyle(route).fill;
  await Promise.all(
    ['neutral', 'info', 'success', 'warning', 'error'].flatMap((tone) =>
      ['normal', 'strong', 'subdued'].map(async (emphasis) => {
        const annotation = canvasElement.querySelector(`[aria-label="${tone} ${emphasis} annotation: Count 42"]`)!;
        const style = getComputedStyle(annotation);
        // Check annotation text and its emphasis border on both demo surfaces.
        await expect(contrast(style.color, style.backgroundColor)).toBeGreaterThanOrEqual(4.5);
        await expect(contrast(style.borderTopColor, style.backgroundColor)).toBeGreaterThanOrEqual(3);
        await expect(contrast(style.borderTopColor, routeBackground)).toBeGreaterThanOrEqual(3);
      }),
    ),
  );
};

Light.play = verifyPresentation;
Dark.play = verifyPresentation;

const verifyBranchConnections = async (route: Element, branch: 'when' | 'otherwise') => {
  const point = (id: string, end: boolean) => {
    const path = route.querySelector<SVGPathElement>(`[data-demo-edge="${id}"] path.kaoto-overlay`)!;
    return path.getPointAtLength(end ? path.getTotalLength() : 0);
  };
  const entry = branch === 'when' ? 'when-2399-to-1402' : 'otherwise-3621-to-3904';
  const exit = branch === 'when' ? 'to-1402-choice-exit' : 'to-3904-choice-exit';
  await Promise.all(
    [
      ['from-1199-choice-1601', entry],
      [exit, 'choice-1601-to-2430'],
    ].map(([from, to]) => {
      const a = point(from, true);
      const b = point(to, false);
      return expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.1);
    }),
  );
};

export const StoreUpdates: Story = {
  args: { dark: false },
  play: async (context) => {
    await verifyPresentation(context);
    const canvas = within(context.canvasElement);
    const route = context.canvasElement.querySelector('[data-demo-group="route-1837"]')!;
    await verifyBranchConnections(route, 'when');
    await userEvent.click(canvas.getByRole('button', { name: 'Show otherwise path' }));
    await verifyBranchConnections(route, 'otherwise');
    await expect(route.querySelector('[data-demo-node="to-1402"] rect.kaoto-overlay')).toBeNull();
    await expect(route.querySelector('[data-demo-node="to-3904"] rect.kaoto-overlay')).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Update counts' }));
    await expect(canvas.getByRole('button', { name: 'from-1199 message count: 43' })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Clear counts' }));
    await expect(route.querySelector('.kaoto-overlay-demo__step-annotation')).toBeNull();
    await expect(route.querySelector('.kaoto-overlay-demo__edge-annotation')).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect metrics' }));
    await expect(route.querySelector('.kaoto-overlay-annotation')).toBeNull();
    await expect(route.querySelector('[data-demo-node="to-3904"] rect.kaoto-overlay')).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Reset demo' }));
    await verifyPresentation(context);
  },
};
